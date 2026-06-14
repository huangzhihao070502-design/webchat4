package com.webchat4.app

import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private var serverManager: ServerManager? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val webView = findViewById<WebView>(R.id.webview)
        val splash = findViewById<android.view.View>(R.id.splash_layout)
        val statusText = findViewById<TextView>(R.id.status_text)
        val titleText = findViewById<TextView>(R.id.title_text)

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

        titleText.text = "启动中..."
        statusText.text = "正在初始化..."

        serverManager = ServerManager(this)
        serverManager?.startServer { success ->
            runOnUiThread {
                splash?.visibility = android.view.View.GONE
                if (success) {
                    titleText.text = "WebChat4"
                    webView.loadUrl("http://127.0.0.1:3001")
                } else {
                    val err = serverManager?.lastError ?: "未知错误"
                    titleText.text = "启动失败"
                    statusText.text = err
                    statusText.setTextColor(0xFFCC0000.toInt())
                }
            }
        }
    }

    override fun onBackPressed() {
        val w = findViewById<WebView>(R.id.webview)
        if (w.canGoBack()) w.goBack() else super.onBackPressed()
    }
}
