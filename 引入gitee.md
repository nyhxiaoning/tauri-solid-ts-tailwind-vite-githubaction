

# Gitee 同步功能通用设计与接入指南

## 结论：Gitee 可以实现同类能力

可以。Gitee 官方 Open API v5 提供仓库文件读取、新建和更新接口，可以把应用数据序列化为 JSON，保存为仓库中的文件，再由其他客户端读取并导入。

但不能把 GitHub Contents API 请求简单替换成 Gitee 域名：Gitee 新建文件使用 `POST`、更新使用 `PUT`；更新需要文件 Blob SHA；分支参数、认证参数位置和读取响应模型也有差别。应用自己的数据快照、校验和本地导入逻辑可以复用，平台 HTTP 传输需要使用 Gitee 专用适配器。

> 本文描述的是通过 Gitee Open API 操作仓库文件，不是 Git 客户端的 `git pull` / `git push`，也不提供业务数据的自动双向合并。

## 1. 设计目标和适用范围

本文面向希望把本地数据同步到 Gitee 仓库的任意项目。数据库、框架和 UI 均可替换；共同部分是定义一个可序列化的数据快照，并通过平台 API 读写文件。

适合：

- 把一份 JSON 配置、应用数据或导出快照保存到 Gitee 仓库。
- 通过仓库历史保留快照变更记录。
- 为不同设备/环境提供显式的远程拉取和本地导入操作。

不等同于：

- Git 客户端完整的 clone / fetch / pull / push 功能。
- 多端实时同步、文件监听或自动解决业务字段冲突。
- 无需权限控制的公开数据存储。

## 2. 推荐架构：平台适配与业务数据分层

建议将同步流程分为三层：

```text
页面 / 命令行 / 定时任务
          |
          v
应用数据适配层
  导出快照、校验 schema、导入/替换本地数据
          |
          v
平台无关的文件同步契约
  readFile / createFile / updateFile
          |
          v
Gitee Contents API 适配器
  URL、认证、Base64、POST/PUT、SHA、分支、错误映射
```

应用数据层不应关心 Gitee 使用什么 HTTP 方法；Gitee 适配器也不应理解 Dexie 表、业务主键或 UI 状态。这样将来增加 GitHub、自建 Git 服务或其他后端时，可以保留同一份快照协议，只替换 provider。

一个概念性接口可以是：

```ts
interface RemoteFile {
  content: string;  // 适配器解码后的 UTF-8 文件文本
  revision: string; // provider 返回的版本标识；Gitee 对应 Blob SHA
}

interface FileTarget {
  owner: string;
  repo: string;
  path: string;
  readRef?: string;
  writeBranch?: string;
}

interface RepositoryFileProvider {
  readFile(target: FileTarget): Promise<RemoteFile | null>;
  createFile(target: FileTarget, content: string, message: string): Promise<RemoteFile>;
  updateFile(
    target: FileTarget,
    content: string,
    message: string,
    revision: string,
  ): Promise<RemoteFile>;
}
```

`FileTarget` 至少需要仓库 owner、仓库名、文件路径；Gitee 实现还应支持读分支/版本 `ref` 和写分支 `branch`。Token 可以由 provider 的安全凭证提供器读取，不应混入数据快照或日志。以上是职责划分示例，不是要求照搬的具体 SDK。

## 3. Gitee Open API v5 文件接口

官方 schema 当前将 API 的 basePath 标为 `/api`，文件操作路径以 `/v5` 开始，完整地址形如：

```text
https://gitee.com/api/v5/repos/{owner}/{repo}/contents/{path}
```

API 文档可能更新。写代码前请查阅 Gitee 官方 [API v5 Swagger 文档](https://gitee.com/api/v5/swagger) 和 [OpenAPI schema](https://gitee.com/api/v5/swagger_doc)。本文核对时 schema 的版本为 `5.4.93`。

### 3.1 读取文件

```text
GET /api/v5/repos/{owner}/{repo}/contents/{path}
```

- 可用 `ref` 指定分支、tag 或 commit；省略时使用仓库默认分支。
- OpenAPI 将 `access_token` 描述为 query 参数。
- 响应 schema 将结果描述为 `Content[]`；单项包含 `type`、`encoding`、`content`、`sha`、`path` 等字段。
- 调用方应校验真实响应结构、`type` 和 `encoding`，确认取到的是预期文件而不是目录内容，再解码文件内容。不能假设响应一定与 GitHub API 一样是单个 JSON 对象。
- 读取文件时保存其 `sha`，后续更新需要用它作为 revision。

### 3.2 新建文件

```text
POST /api/v5/repos/{owner}/{repo}/contents/{path}
```

创建文件至少需要：

- `content`：Base64 编码后的文件内容。
- `message`：Git 提交信息。
- 可选 `branch`：目标分支；省略时使用仓库默认分支。
- `access_token`：OpenAPI 将写操作中的 Token 描述为 formData 参数。

官方 schema 为新建操作声明 HTTP `201`。判断成功时应同时检查 HTTP 状态和响应体，不能只依赖按钮点击结果。

### 3.3 更新文件

```text
PUT /api/v5/repos/{owner}/{repo}/contents/{path}
```

更新至少需要 `content`、`message` 和 `sha`，并可指定 `branch`。`sha` 应来自目标分支上该文件的最新读取结果；缺少或过期的 SHA 可能导致更新失败。更新成功后保存响应中新的 SHA，供下一次更新使用。官方 schema 为更新操作声明 HTTP `200`。

Gitee 与 GitHub 的主要传输差异：

| 行为 | Gitee Open API v5 | GitHub Contents API |
|---|---|---|
| 读取路径 | `/api/v5/repos/{owner}/{repo}/contents/{path}` | `/repos/{owner}/{repo}/contents/{path}` |
| 新建文件 | `POST` | 通常使用 `PUT`，不带 SHA |
| 更新文件 | `PUT`，必需 Blob `sha` | `PUT`，带文件 `sha` |
| 读版本参数 | `ref` | 读取接口支持 ref 相关参数 |
| 写分支参数 | `branch` | `branch` |
| OpenAPI 中 Token 位置 | GET 标为 query；写操作标为 formData | 常见集成使用 Authorization header |
| 读取响应 | Gitee schema 标为 `Content[]` | 文件读取通常返回单个内容对象 |

方法和参数请以当前 Gitee 官方文档为准，不要复用 GitHub 适配器中的 URL、请求方法、认证头或响应解析逻辑。

### 3.4 请求体格式注意：先做契约验证

本文核对的 Gitee OpenAPI schema 存在一处需要特别处理的描述不一致：新建/更新字段列在 `formData` 参数中，但对应操作同时声明 `consumes: application/json`。

因此，不要仅凭参数表就断定应使用 `FormData`、URL 编码表单或 JSON body。接入时先在官方 Swagger 的 Try-it-out 页面、Gitee 官方 SDK 或经过确认的 API 客户端中核实实际请求格式，并对目标部署环境运行一次新建/更新集成测试。将确认过的 HTTP 方法、Content-Type、请求字段和响应样例记录为契约测试，避免升级文档或 SDK 后悄悄改变。

## 4. 定义 provider-neutral 数据快照

业务数据需要有独立于 Gitee API 的稳定结构，例如：

```json
{
  "version": 1,
  "updatedAt": "2026-01-15T10:30:00.000Z",
  "collections": {
    "items": [],
    "settings": []
  }
}
```

由应用自行定义：

- `version` 的兼容和迁移规则。
- 每次同步包含哪些集合，未选集合如何处理。
- 本地 ID、关联数据和唯一索引在跨设备导入时的规则。
- `Date` 等运行时类型如何序列化和还原。
- 空集合表示“数据为空”还是“未选择同步”。
- 拉取时是完全覆盖还是按稳定 ID 合并。

Gitee 的 SHA 只是仓库文件 revision，不是应用记录 ID，也不是业务冲突解决机制。若数据协议不支持合并，应明确告知用户拉取会替换所选本地数据。

## 5. 通用项目接入步骤

### 第一步：盘点数据和同步所有权

记录数据来源、表/集合、读写位置、ID 规则、数据量和文件所有者。为不同数据域指定明确路径，避免多个模块以不兼容的 schema 写入同一个远程文件。

### 第二步：定义读写目标配置

至少明确：

- Gitee 用户/组织地址（owner）。
- 仓库路径（repo）。
- 仓库内文件路径（path）。
- 读取使用的 `ref` 以及写入使用的 `branch`。
- 凭证的创建、授权、保存、撤销和轮换方式。

默认分支可能不同于 `master`。优先让用户选择分支或使用仓库实际默认分支，不要在代码中硬编码猜测。

### 第三步：实现 Gitee provider adapter

适配器负责：

1. 拼接 Gitee API v5 URL 并对 owner、repo、文件路径进行正确编码。
2. 依据已验证的 API 约定放置 Token。
3. GET 文件并检查返回结构、文件类型、编码字段和 SHA。
4. 将 UTF-8 JSON 文本编码为 Gitee 要求的 Base64 内容。
5. 不存在时调用新建流程；存在时携带 SHA 调用更新流程。
6. 将 HTTP 错误、JSON 解析失败、Token 错误、分支/路径错误和 SHA 冲突转换成调用方可理解的信息。

若 API 返回目录列表而非目标文件、缺少 `content`/`sha` 或 `encoding` 不符合预期，应停止操作并报错，不要把该响应当作空文件继续覆盖。

### 第四步：实现本地导出和导入

推送前从本地持久化层生成快照。拉取时先下载文件、解码 JSON、校验版本和本次同步的全部集合，然后才操作本地数据。

多个集合需要一起更新时，优先使用数据库事务；事务失败时应回滚。无法使用事务的存储可考虑导入临时区，验证完整后再替换。覆盖式拉取前评估本地备份和 Git 历史恢复路径。

### 第五步：接入 UI 或命令行

将“上传到 Gitee”和“从 Gitee 拉取”作为方向明确的操作呈现。显示目标 owner/repo/path/ref 或 branch、进度、成功结果和可操作的失败信息。覆盖式拉取应提醒用户其影响的本地数据范围。

若同一产品支持多个仓库平台，配置中显式保存 provider 类型，并隔离各 provider 的凭证、仓库和路径设置。不要因为 provider 名称共享就默认它们的认证、分支或 SHA 语义相同。

### 第六步：验证并发布

先对专用测试仓库验证：

1. 用实际环境验证 GET 文件、读取 `content`/`encoding`/`sha` 和 `ref`。
2. 验证 POST 新建文件及成功响应。
3. 再次读取文件取得 SHA，验证 PUT 更新及成功响应。
4. 使用旧 SHA 或分支错误的场景，确认能显示失败并保留可恢复的数据。
5. 验证无权限、Token 无效、路径错误、文件是目录、损坏 JSON 和错误 schema。
6. 验证任一校验失败都不会清空或部分修改本地数据。
7. 验证空快照、覆盖/合并和多分支操作符合产品约定。

Gitee 不同错误可能有不同 HTTP 状态和响应格式；实现应保留状态码及服务端错误信息用于诊断，不要只按 GitHub 的状态码假设处理。

## 6. 凭证与安全设计

- Token 是可执行仓库操作的凭证；不要提交到代码、同步快照、错误报告或日志。
- 本文核对的官方 schema 将 GET 的 `access_token` 放在 URL query，将写操作 Token 标为 formData。Query 参数可能进入浏览器历史、代理/服务端访问日志、监控或错误上报。高风险场景优先通过后端代理请求，避免浏览器直接持有长期凭证。
- 如果产品必须在前端使用 Token，应先验证平台 CORS 和部署环境行为，明确 Token 保存位置、访问边界、清除方式和轮换方法。密码输入框不是安全存储。
- 不要在指南中宣称 Gitee 一定支持某种细粒度只读/读写授权模式；按当前账号 Token 创建界面和 API 授权行为实际提供的范围配置最小权限。
- 私有仓库不等于适合存储个人凭证、密钥或其他敏感业务数据。

## 7. 当前 React + Dexie 项目的迁移设计

当前仓库的业务快照和 GitHub HTTP API 混在 [github-sync.ts](../src/services/github-sync.ts) 中；[SyncButton.tsx](../src/components/github/SyncButton.tsx) 直接调用 GitHub 专属方法；[syncConfig.ts](../src/db/syncConfig.ts) 以命名空间隔离配置，但将 Token 与配置保存在 `localStorage`。

因此，Gitee 接入不能只把 API 域名改成 `gitee.com`。可按以下方向拆分：

1. **复用本地数据导出**：保留 `SyncDataPackage`、集合范围和 Dexie 读取行为；若要支持多个 provider，考虑把数据包构建/领域类型从 GitHub 传输服务中分离。
2. **新增 Gitee 传输实现**：例如新增 `src/services/gitee-sync.ts`，处理 Gitee 专属 URL、GET/POST/PUT、Base64、`ref`/`branch`、Token 参数和响应解析。
3. **定义 provider 接口**：让 UI 调用平台无关的 read/create/update 操作，不直接依赖 `pushToGithub` 或 `pullFromGithub`。
4. **选择 UI 方案**：只支持 Gitee 时可提供 Gitee 专属设置/同步入口；需要 GitHub 与 Gitee 并存时，让界面选择 provider 并为不同平台隔离配置。
5. **复用本地导入事务**：远端数据通过 provider 下载后，先验证所有目标集合，再使用现有 Dexie 事务语义替换本地数据；明确该行为是覆盖而非合并。
6. **重新评估 Token 存储**：不要将现有 localStorage PAT 方案自动复制到 Gitee；考虑后端代理或其他符合产品风险的凭证保护方式。

相关现状可对照 [GitHub 同步通用指南](./github-sync-integration-guide.md)。它介绍本地集合同步流程；本文补充 Gitee provider 的 API 差异。

## 8. 故障排查清单

| 现象 | 排查方向 |
|---|---|
| 认证失败或权限不足 | Token 是否有效；当前账号授权是否覆盖目标仓库和目标操作；确认 Token 未被撤销。 |
| 找不到仓库/文件 | 检查 owner、repo、path、`ref`/`branch`；区分文件路径和目录路径；确认目标分支存在。 |
| 新建文件失败 | 确认该路径上不存在同名文件；确认 POST 请求格式与官方 API 当前契约一致；检查提交信息和分支。 |
| 更新文件失败 | 重新 GET 文件获取当前 SHA；确认 SHA 与目标分支上的文件对应；排查并发更新。 |
| 响应无法解析 | 检查 Content-Type、响应是否为 `Content[]`、文件 `type`、`encoding`、Base64 内容和 API 错误体。 |
| Gitee 可用但浏览器请求失败 | 检查浏览器 CORS、网络策略和 Token 是否进入 URL；必要时改由后端代理发请求。 |
| 远程数据正确但本地记录缺失 | 检查快照版本、集合名、ID/索引映射和导入事务；确认页面刷新了正确的数据源。 |

## 9. 发布前可复用清单

- [ ] Gitee API 请求被隔离在 provider adapter 中，本地数据层不依赖 Gitee HTTP 细节。
- [ ] 已按当前官方文档或官方 SDK 验证创建/更新的真实请求 Content-Type 和字段编码。
- [ ] GET 已验证响应是目标文件，并能读取 `content`、`encoding` 和 `sha`。
- [ ] 新建使用 POST；更新使用 PUT，并携带最新 Blob SHA。
- [ ] 读取 `ref` 和写入 `branch` 的选择已明确，不依赖硬编码默认分支名。
- [ ] Token 的授权范围、保存位置、日志脱敏、撤销和轮换方案已评估。
- [ ] 所有本地导入数据在任何删除/写入前完成验证。
- [ ] 覆盖、合并、空快照、备份和并发更新语义已由产品明确。
- [ ] 测试覆盖成功流程、权限/路径错误、请求格式、SHA 冲突和本地回滚。
- [ ] 使用专用测试仓库验证后，再启用真实数据同步。

## 10. 官方资料

- [Gitee API v5 Swagger](https://gitee.com/api/v5/swagger)
- [Gitee OpenAPI schema](https://gitee.com/api/v5/swagger_doc)

API 描述、授权选项和请求约定可能变化；实现前应重新核对官方资料，并使用目标 Gitee 环境做契约验证。
