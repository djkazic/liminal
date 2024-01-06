package com.liminal;

import android.Manifest;

import android.content.Context;
import android.content.pm.PackageManager;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import android.os.Build;
import android.os.Bundle;
import android.util.Log;

import litdmobile.Callback;
import litdmobile.Litdmobile;
import litdmobile.RecvStream;
import litdmobile.SendStream;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.Files;

import java.util.concurrent.CompletableFuture;

import lnrpc.Lnd;

import routerrpc.RouterOuterClass;

public class MainActivity extends ReactActivity {

    private CompletableFuture<String> gossipSync() {
        LndModule.gossipSync = true;
        CompletableFuture<String> future = new CompletableFuture<>();
        // Lndmobile.gossipSync(
        // getApplicationContext().getCacheDir().getAbsolutePath(),
        // getApplicationContext().getFilesDir().getAbsolutePath(),
        // "wifi", // TOOD: remove deprecated networkType param
        // new lndmobile.Callback() {
        // @Override
        // public void onError(Exception e) {
        // future.completeExceptionally(e);
        // }

        // @Override
        // public void onResponse(byte[] bytes) {
        // String response = new String(bytes, StandardCharsets.UTF_8);
        // future.complete(response);
        // }
        // });
        future.complete("mockGossip");
        return future;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        setTheme(R.style.AppTheme);
        super.onCreate(null);
        if (LndModule.lndStarted) {
            return;
        }
        Runnable lnd = new Runnable() {
            @Override
            public void run() {
                String lndPath = getApplicationContext().getFilesDir().getPath();
                Path filePath = Paths.get(lndPath + "/data/chain/bitcoin/mainnet/wallet.db");
                boolean unlock = false;
                if (Files.exists(filePath)) {
                    gossipSync().thenAccept(response -> {
                        Log.i("LITD", "GossipSync: " + response);
                        LndModule.gossipSync = false;
                    }).exceptionally(e -> {
                        e.printStackTrace();
                        return null;
                    });
                    unlock = true;
                    File password = new File(lndPath, "password");
                    FileWriter pwWriter;
                    try {
                        pwWriter = new FileWriter(password);
                        pwWriter.append("moneyprintergobrrr");
                        pwWriter.flush();
                        pwWriter.close();
                        Log.i("LITD", "Wrote password file to " + password.getAbsolutePath());
                    } catch (IOException e) {
                        Log.e("LITD", "Error writing password file", e);
                    }
                }
                File config = new File(lndPath, "lit.conf");
                FileWriter writer;
                try {
                    writer = new FileWriter(config);
                    StringBuilder sb = new StringBuilder();
                    sb.append("httpslisten=0.0.0.0:8443\n")
                            .append("disableui=true\n")
                            .append("lnd-mode=integrated\n")
                            .append("network=mainnet\n\n")
                            .append("lnd.lnddir=").append(lndPath).append("/lnd\n")
                            .append("lnd.nolisten=true\n")
                            .append("lnd.norest=true\n")
                            .append("lnd.sync-freelist=true\n")
                            .append("lnd.accept-keysend=true\n")
                            .append("lnd.tlsdisableautofill=true\n");
                    if (unlock) {
                        sb.append("lnd.wallet-unlock-password-file=").append(lndPath).append("/password\n\n");
                    }
                    sb.append("lnd.gossip.pinned-syncers=028c589131fae8c7e2103326542d568373019b50a9eb376a139a330c8545efb79a\n")
                            .append("lnd.routing.assumechanvalid=true\n")
                            .append("lnd.bitcoin.active=true\n")
                            .append("lnd.bitcoin.mainnet=true\n")
                            .append("lnd.bitcoin.node=neutrino\n")
                            .append("lnd.neutrino.addpeer=btcd.lnolymp.us\n")
                            .append("lnd.neutrino.addpeer=node.blixtwallet.com\n")
                            .append("lnd.neutrino.feeurl=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json\n")
                            .append("lnd.neutrino.persistfilters=true\n")
                            .append("lnd.protocol.zero-conf=true\n")
                            .append("lnd.protocol.option-scid-alias=true\n")
                            .append("lnd.routerrpc.estimator=bimodal\n\n");
                    sb.append("faraday.faradaydir=").append(lndPath).append("/faraday\n\n");
                    sb.append("loop.loopdir=").append(lndPath).append("/loop\n\n");
                    sb.append("pool.basedir=").append(lndPath).append("/pool\n\n");
                    sb.append("taproot-assets.tapddir=").append(lndPath).append("/tapd\n\n");
                    writer.write(sb.toString());
                    writer.flush();
                    writer.close();
                    Log.i("LITD", "Config file written to " + config.getAbsolutePath());
                } catch (IOException e) {
                    Log.e("LITD", "Error writing config file", e);
                }
                // String args = "--lnd.lnddir=" + lndPath;
                // String args = "--network=mainnet --lnd-mode=integrated --lnd.bitcoin.active --lnd.bitcoin.mainnet --lnd.lnddir=" + lndPath + " --lnd.bitcoin.node=neutrino --lnd.neutrino.addpeer=node.blixtwallet.com --lnd.neutrino.feeurl=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json";
                String args = "--lit-dir=" + lndPath;
                Log.i("LND", args);
                String rescanFileName = "rescanrequested";
                Path rescanFilePath = Paths.get(lndPath, rescanFileName);
                if (Files.exists(rescanFilePath)) {
                    try {
                        Files.delete(rescanFilePath);
                    } catch (IOException e) {
                        Log.i("LND", "Failed to delete rescanrequested");
                    }
                    args += " --lnd.reset-wallet-transactions";
                }
                Log.i("LND", "Starting LND with args " + args);
                Litdmobile.start(args, new litdmobile.Callback() {
                    @Override
                    public void onError(Exception e) {
                        Log.e("LND", "Error starting LNDmobile", e);
                    }

                    @Override
                    public void onResponse(byte[] bytes) {
                        LndModule.lndStarted = true;
                        Log.i("LND", "Litdmobile started");
                        Runnable transactions = new Runnable() {
                            @Override
                            public void run() {
                                Lnd.InvoiceSubscription request = Lnd.InvoiceSubscription
                                        .newBuilder().build();
                                try {
                                    Thread.sleep(9000);
                                } catch (InterruptedException e) {
                                    e.printStackTrace();
                                }
                                Log.i("LND", "Subscribing to invoices");
                                Litdmobile.subscribeInvoices(request.toByteArray(),
                                        new InvoiceRecvStream(LndModule.reactContext));
                            }
                        };
                        new Thread(transactions).start();
                        Runnable payments = new Runnable() {
                            @Override
                            public void run() {
                                RouterOuterClass.TrackPaymentsRequest request = RouterOuterClass.TrackPaymentsRequest
                                        .newBuilder().build();
                                try {
                                    Thread.sleep(9000);
                                } catch (InterruptedException e) {
                                    e.printStackTrace();
                                }
                                Log.i("LND", "Subscribing to payments");
                                Litdmobile.routerTrackPayments(request.toByteArray(),
                                        new TrackPaymentsRecvStream(LndModule.reactContext));
                            }
                        };
                        new Thread(payments).start();
                    }
                });
            }
        };
        new Thread(lnd).start();
    }

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    @Override
    protected String getMainComponentName() {
        return "liminal";
    }

    /**
     * Align the back button behavior with Android S
     * where moving root activities to background instead of finishing activities.
     * 
     * @see <a href=
     *      "https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
     */
    @Override
    public void invokeDefaultOnBackPressed() {
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
            if (!moveTaskToBack(false)) {
                // For non-root activities, use the default implementation to finish them.
                super.invokeDefaultOnBackPressed();
            }
            return;
        }

        // Use the default back button implementation on Android S
        // because it's doing more than {@link Activity#moveTaskToBack} in fact.
        super.invokeDefaultOnBackPressed();
    }
}
