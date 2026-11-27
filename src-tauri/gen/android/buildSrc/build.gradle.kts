plugins {
    `kotlin-dsl`
}

gradlePlugin {
    plugins {
        create("pluginsForCoolKids") {
            id = "rust"
            implementationClass = "RustPlugin"
        }
    }
}

repositories {
    // 阿里云镜像优先,google()/mavenCentral() 兜底(国内无代理也可构建)
    maven("https://maven.aliyun.com/repository/google")
    maven("https://maven.aliyun.com/repository/central")
    google()
    mavenCentral()
}

dependencies {
    compileOnly(gradleApi())
    implementation("com.android.tools.build:gradle:8.11.0")
}

