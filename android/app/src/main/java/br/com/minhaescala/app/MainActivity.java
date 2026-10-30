package br.com.minhaescala.app;

import android.app.Activity;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public final class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        WebView.setWebContentsDebuggingEnabled(false);
        webView = new WebView(this);
        webView.setBackgroundColor(0xfff0f4ef);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setBlockNetworkLoads(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                request.deny();
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // A marca leva ao início. Nenhum link pode carregar conteúdo externo.
                if ("https://appassets.androidplatform.net/index.html".equals(request.getUrl().toString())) {
                    view.evaluateJavascript("document.querySelector('[data-view=home]').click()", null);
                }
                return true;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                // Imagens data: já estão dentro do HTML; não acessam rede ou arquivos.
                if ("data".equals(request.getUrl().getScheme())) return null;
                return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
            }
            @Override public void onPageFinished(WebView view, String url) {
                // O único recurso nativo disponível ao HTML é abrir a impressão do Android.
                view.evaluateJavascript("window.print = function () { EscalaAndroid.print(); };", null);
            }
        });
        webView.addJavascriptInterface(new PrintBridge(), "EscalaAndroid");
        setContentView(webView);
        try (InputStream input = getAssets().open("index.html")) {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int length;
            while ((length = input.read(buffer)) != -1) output.write(buffer, 0, length);
            String html = new String(output.toByteArray(), "UTF-8");
            // HTTPS é apenas uma origem local de armazenamento: não é feita conexão.
            webView.loadDataWithBaseURL("https://appassets.androidplatform.net/", html, "text/html", "UTF-8", null);
        } catch (Exception error) {
            TextView message = new TextView(this);
            message.setText("Não foi possível abrir a escala. Reinstale o APK de teste.");
            message.setPadding(32, 32, 32, 32);
            setContentView(message);
        }
    }

    public final class PrintBridge {
        @JavascriptInterface public void print() {
            runOnUiThread(() -> {
                if (isFinishing() || webView == null) return;
                webView.postDelayed(() -> {
                    if (isFinishing() || webView == null) return;
                    PrintManager manager = (PrintManager) getSystemService(PRINT_SERVICE);
                    if (manager != null) {
                        manager.print("Minha escala", webView.createPrintDocumentAdapter("Minha escala"),
                            new PrintAttributes.Builder()
                                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                                .build());
                    }
                }, 200);
            });
        }
    }

    @Override public void onBackPressed() {
        if (webView == null) { finish(); return; }
        webView.evaluateJavascript("(function(){var e=document.getElementById('editor-view');if((e&&!e.hidden)||document.body.classList.contains('is-details')){document.querySelector('[data-view=home]').click();return true;}return false;})()",
            handled -> { if (!"true".equals(handled)) finish(); });
    }

    @Override protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("EscalaAndroid");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
