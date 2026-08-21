package com.lanshare.app

import android.app.Activity
import android.database.Cursor
import android.net.Uri
import android.provider.OpenableColumns
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@TauriPlugin
class ContentPlugin(private val activity: Activity) : Plugin(activity) {
    @Command
    fun getContentInfo(invoke: Invoke) {
        val args = invoke.parseArgs(GetContentInfoArgs::class.java)
        val uri = Uri.parse(args.uri)
        val resolver = activity.contentResolver

        var displayName = ""
        var mimeType = ""

        try {
            mimeType = resolver.getType(uri) ?: ""
        } catch (_: Exception) {
            mimeType = ""
        }

        var cursor: Cursor? = null
        try {
            cursor = resolver.query(
                uri,
                arrayOf(OpenableColumns.DISPLAY_NAME),
                null,
                null,
                null,
            )
            if (cursor != null && cursor.moveToFirst()) {
                val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (index >= 0) {
                    displayName = cursor.getString(index) ?: ""
                }
            }
        } catch (_: Exception) {
            displayName = ""
        } finally {
            cursor?.close()
        }

        val ret = JSObject()
        ret.put("displayName", displayName)
        ret.put("mimeType", mimeType)
        invoke.resolve(ret)
    }

    private data class GetContentInfoArgs(val uri: String)
}
