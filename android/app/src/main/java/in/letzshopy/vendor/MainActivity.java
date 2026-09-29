package in.letzshopy.vendor;

import android.graphics.Color;
import android.os.Bundle;
import android.webkit.CookieManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private void persistWebViewCookies() {
        CookieManager.getInstance().flush();
    }

    private void configureSystemBars() {
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(
                        getWindow(),
                        getWindow().getDecorView()
                );

        controller.setAppearanceLightStatusBars(true);
        controller.setAppearanceLightNavigationBars(true);

        getWindow().setStatusBarColor(
                Color.rgb(248, 250, 252)
        );
        getWindow().setNavigationBarColor(
                Color.rgb(248, 250, 252)
        );
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureSystemBars();
    }

    @Override
    public void onResume() {
        CookieManager.getInstance().setAcceptCookie(true);
        super.onResume();
        configureSystemBars();
    }

    @Override
    public void onPause() {
        persistWebViewCookies();
        super.onPause();
    }

    @Override
    public void onStop() {
        persistWebViewCookies();
        super.onStop();
    }

    @Override
    public void onDestroy() {
        persistWebViewCookies();
        super.onDestroy();
    }
}
