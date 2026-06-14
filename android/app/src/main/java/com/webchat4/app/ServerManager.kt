package com.webchat4.app

import android.content.Context

class ServerManager(private val context: Context) {
    private var webServer: WebServer? = null

    fun isRunning(): Boolean = webServer?.isRunning() == true

    fun startServer(callback: (Boolean) -> Unit) {
        Thread {
            webServer = WebServer(context, 3001)
            val ok = webServer!!.start()
            callback(ok)
        }.start()
    }

    fun stopServer() {
        webServer?.stop()
        webServer = null
    }
}
