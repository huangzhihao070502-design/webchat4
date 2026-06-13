package com.webchat4.app

import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var serverManager: ServerManager
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        setupWebView()

        serverManager = ServerManager(this)

        if (!serverManager.isRunning()) {
            serverManager.startServer { success ->
                runOnUiThread {
                    if (success) {
                        loadWebApp()
                    }
                }
            }
        } else {
            loadWebApp()
        }
    }

    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
        }
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                findViewById<android.view.View>(R.id.splash_layout)?.visibility = android.view.View.GONE
                webView.visibility = android.view.View.VISIBLE
            }
        }
        webView.webChromeClient = WebChromeClient()
    }

    private fun loadWebApp() {
        webView.loadUrl("http://127.0.0.1:3001")
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack()
        else super.onBackPressed()
    }
}
