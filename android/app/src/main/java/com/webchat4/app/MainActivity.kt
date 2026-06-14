package com.webchat4.app

import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private var serverManager: ServerManager? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val webView = findViewById<WebView>(R.id.webview)
        val splash = findViewById<android.view.View>(R.id.splash_layout)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
        }
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                splash?.visibility = android.view.View.GONE
                webView.visibility = android.view.View.VISIBLE
            }
        }
        webView.webChromeClient = WebChromeClient()

        serverManager = ServerManager(this)
        serverManager?.startServer { success ->
            runOnUiThread {
                if (success) {
                    webView.loadUrl("http://127.0.0.1:3001")
                } else {
                    findViewById<android.widget.TextView>(R.id.status_text)?.let {
                        it.text = "启动失败: 无法启动HTTP服务器"
                        it.setTextColor(0xFFCC0000.toInt())
                    }
                }
            }
        }
    }

    override fun onBackPressed() {
        val w = findViewById<WebView>(R.id.webview)
        if (w.canGoBack()) w.goBack() else super.onBackPressed()
    }
}
