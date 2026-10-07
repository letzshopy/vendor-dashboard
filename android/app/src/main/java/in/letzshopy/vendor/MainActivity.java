package in.letzshopy.vendor;

import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.PathInterpolator;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final long BRAND_MIN_SHOW_MS = 1450L;
    private static final long BRAND_FAILSAFE_MS = 8000L;

    private final Handler brandHandler =
            new Handler(Looper.getMainLooper());

    private FrameLayout brandOverlay;
    private long brandStartedAt = 0L;
    private boolean brandDismissRequested = false;

    private int dp(float value) {
        return Math.round(
                value * getResources().getDisplayMetrics().density
        );
    }

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

    private GradientDrawable brandBackground() {
        GradientDrawable background =
                new GradientDrawable(
                        GradientDrawable.Orientation.TOP_BOTTOM,
                        new int[] {
                                Color.rgb(251, 253, 255),
                                Color.rgb(243, 248, 255)
                        }
                );

        background.setShape(
                GradientDrawable.RECTANGLE
        );

        return background;
    }

    private GradientDrawable glowDrawable() {
        GradientDrawable glow =
                new GradientDrawable();

        glow.setShape(
                GradientDrawable.OVAL
        );
        glow.setGradientType(
                GradientDrawable.RADIAL_GRADIENT
        );
        glow.setGradientRadius(
                dp(130)
        );
        glow.setColors(
                new int[] {
                        Color.argb(42, 31, 111, 229),
                        Color.argb(14, 31, 111, 229),
                        Color.TRANSPARENT
                }
        );

        return glow;
    }

    private TextView makeWordmark() {
        TextView wordmark =
                new TextView(this);

        wordmark.setText("letzshopy");
        wordmark.setTextColor(
                Color.rgb(20, 105, 223)
        );
        wordmark.setTextSize(38);
        wordmark.setTypeface(
                Typeface.create(
                        "sans-serif",
                        Typeface.BOLD
                )
        );
        wordmark.setLetterSpacing(-0.035f);
        wordmark.setIncludeFontPadding(false);

        return wordmark;
    }

    private TextView makeTagline() {
        TextView tagline =
                new TextView(this);

        tagline.setText(
                "YOUR ONLINE STORE, SIMPLIFIED"
        );
        tagline.setTextColor(
                Color.rgb(88, 101, 122)
        );
        tagline.setTextSize(8.5f);
        tagline.setTypeface(
                Typeface.create(
                        "sans-serif-medium",
                        Typeface.NORMAL
                )
        );
        tagline.setLetterSpacing(0.12f);
        tagline.setIncludeFontPadding(false);

        return tagline;
    }

    private void animateBrandLockup(
            View glow,
            View lockup
    ) {
        PathInterpolator reveal =
                new PathInterpolator(
                        0.16f,
                        1f,
                        0.3f,
                        1f
                );

        glow.setAlpha(0f);
        glow.setScaleX(0.72f);
        glow.setScaleY(0.72f);

        lockup.setAlpha(0f);
        lockup.setScaleX(0.86f);
        lockup.setScaleY(0.86f);
        lockup.setTranslationY(
                dp(18)
        );

        AnimatorSet logoReveal =
                new AnimatorSet();

        logoReveal.playTogether(
                ObjectAnimator.ofFloat(
                        lockup,
                        View.ALPHA,
                        0f,
                        1f
                ),
                ObjectAnimator.ofFloat(
                        lockup,
                        View.SCALE_X,
                        0.86f,
                        1.02f
                ),
                ObjectAnimator.ofFloat(
                        lockup,
                        View.SCALE_Y,
                        0.86f,
                        1.02f
                ),
                ObjectAnimator.ofFloat(
                        lockup,
                        View.TRANSLATION_Y,
                        dp(18),
                        0f
                ),
                ObjectAnimator.ofFloat(
                        glow,
                        View.ALPHA,
                        0f,
                        1f
                ),
                ObjectAnimator.ofFloat(
                        glow,
                        View.SCALE_X,
                        0.72f,
                        1f
                ),
                ObjectAnimator.ofFloat(
                        glow,
                        View.SCALE_Y,
                        0.72f,
                        1f
                )
        );

        logoReveal.setDuration(560L);
        logoReveal.setInterpolator(reveal);

        AnimatorSet settle =
                new AnimatorSet();

        settle.playTogether(
                ObjectAnimator.ofFloat(
                        lockup,
                        View.SCALE_X,
                        1.02f,
                        1f
                ),
                ObjectAnimator.ofFloat(
                        lockup,
                        View.SCALE_Y,
                        1.02f,
                        1f
                ),
                ObjectAnimator.ofFloat(
                        glow,
                        View.ALPHA,
                        1f,
                        0.56f
                )
        );

        settle.setDuration(260L);

        AnimatorSet sequence =
                new AnimatorSet();

        sequence.playSequentially(
                logoReveal,
                settle
        );

        brandHandler.postDelayed(
                sequence::start,
                170L
        );
    }

    private void installBrandSplashOverlay() {
        ViewGroup content =
                findViewById(
                        android.R.id.content
                );

        if (content == null) {
            return;
        }

        brandStartedAt =
                SystemClock.uptimeMillis();

        FrameLayout overlay =
                new FrameLayout(this);

        overlay.setBackground(
                brandBackground()
        );
        overlay.setClickable(true);
        overlay.setFocusable(true);
        overlay.setElevation(
                dp(30)
        );

        View glow =
                new View(this);

        glow.setBackground(
                glowDrawable()
        );

        FrameLayout.LayoutParams glowParams =
                new FrameLayout.LayoutParams(
                        dp(280),
                        dp(280),
                        Gravity.CENTER
                );

        overlay.addView(
                glow,
                glowParams
        );

        ImageView lockup =
                new ImageView(this);

        lockup.setImageResource(
                R.drawable.letzshopy_brand_logo
        );
        lockup.setScaleType(
                ImageView.ScaleType.FIT_CENTER
        );
        lockup.setAdjustViewBounds(true);

        FrameLayout.LayoutParams lockupParams =
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        dp(105),
                        Gravity.CENTER
                );

        lockupParams.leftMargin =
                dp(24);
        lockupParams.rightMargin =
                dp(24);

        overlay.addView(
                lockup,
                lockupParams
        );

        content.addView(
                overlay,
                new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );

        brandOverlay =
                overlay;

        animateBrandLockup(
                glow,
                lockup
        );

        brandHandler.postDelayed(
                this::dismissBrandSplash,
                BRAND_FAILSAFE_MS
        );
    }

    private void attachBrandReadyBridge() {
        try {
            if (
                    getBridge() == null ||
                    getBridge().getWebView() == null
            ) {
                return;
            }

            WebView webView =
                    getBridge().getWebView();

            webView.addJavascriptInterface(
                    new BrandReadyBridge(),
                    "LetzShopyBrand"
            );
        } catch (Exception ignored) {
            // Failsafe timeout still removes the splash.
        }
    }

    private void requestBrandDismiss() {
        if (
                brandOverlay == null ||
                brandDismissRequested
        ) {
            return;
        }

        brandDismissRequested =
                true;

        long elapsed =
                SystemClock.uptimeMillis() -
                brandStartedAt;

        long delay =
                Math.max(
                        0L,
                        BRAND_MIN_SHOW_MS -
                        elapsed
                );

        brandHandler.postDelayed(
                this::dismissBrandSplash,
                delay
        );
    }

    private void dismissBrandSplash() {
        FrameLayout overlay =
                brandOverlay;

        if (overlay == null) {
            return;
        }

        overlay.animate()
                .alpha(0f)
                .setDuration(240L)
                .withEndAction(
                        () -> {
                            ViewGroup parent =
                                    (ViewGroup)
                                            overlay.getParent();

                            if (parent != null) {
                                parent.removeView(
                                        overlay
                                );
                            }

                            if (
                                    brandOverlay ==
                                    overlay
                            ) {
                                brandOverlay =
                                        null;
                            }
                        }
                )
                .start();
    }

    private final class BrandReadyBridge {
        @JavascriptInterface
        public void ready() {
            runOnUiThread(
                    MainActivity.this::
                            requestBrandDismiss
            );
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        configureSystemBars();
        installBrandSplashOverlay();
        attachBrandReadyBridge();
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
        brandHandler.removeCallbacksAndMessages(
                null
        );

        if (
                brandOverlay != null &&
                brandOverlay.getParent() != null
        ) {
            ((ViewGroup)
                    brandOverlay.getParent())
                    .removeView(
                            brandOverlay
                    );
            brandOverlay =
                    null;
        }

        persistWebViewCookies();
        super.onDestroy();
    }
}
