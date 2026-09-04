# THIS FILE IS AUTO-GENERATED. DO NOT MODIFY!!

# Copyright 2020-2023 Tauri Programme within The Commons Conservancy
# SPDX-License-Identifier: Apache-2.0
# SPDX-License-Identifier: MIT

-keep class com.lanshare.app.* {
  native <methods>;
}

-keep class com.lanshare.app.WryActivity {
  public <init>(...);

  void setWebView(com.lanshare.app.RustWebView);
  java.lang.Class getAppClass(...);
  java.lang.String getVersion();
}

-keep class com.lanshare.app.Ipc {
  public <init>(...);

  @android.webkit.JavascriptInterface public <methods>;
}

-keep class com.lanshare.app.RustWebView {
  public <init>(...);

  void loadUrlMainThread(...);
  void loadHTMLMainThread(...);
  void evalScript(...);
}

-keep class com.lanshare.app.RustWebChromeClient,com.lanshare.app.RustWebViewClient {
  public <init>(...);
}
