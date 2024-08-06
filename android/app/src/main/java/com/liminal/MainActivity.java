package com.liminal;

import android.Manifest;

import android.content.Context;
import android.content.pm.PackageManager;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import android.os.Build;
import android.os.Bundle;
import android.util.Log;

import lndmobile.Callback;
import lndmobile.Lndmobile;
import lndmobile.RecvStream;
import lndmobile.SendStream;

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

import lnrpc.LightningOuterClass;

import routerrpc.RouterOuterClass;

public class MainActivity extends ReactActivity {

    private CompletableFuture<String> gossipSync() {
        LndModule.gossipSync = true;
        CompletableFuture<String> future = new CompletableFuture<>();
        Lndmobile.gossipSync(
                "https://primer.blixtwallet.com",
                getApplicationContext().getCacheDir().getAbsolutePath(),
                getApplicationContext().getFilesDir().getAbsolutePath(),
                "wifi", // TOOD: remove deprecated networkType param
                new lndmobile.Callback() {
                    @Override
                    public void onError(Exception e) {
                        future.completeExceptionally(e);
                    }

                    @Override
                    public void onResponse(byte[] bytes) {
                        String response = new String(bytes, StandardCharsets.UTF_8);
                        future.complete(response);
                    }
                });
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
                String network = BuildConfig.FLAVOR_network.replace("bitcoin", "").toLowerCase();
                Path filePath = Paths.get(lndPath + "/data/chain/bitcoin/" + network + "/wallet.db");
                boolean unlock = false;
                if (Files.exists(filePath)) {
                    if (network == "mainnet") {
                        gossipSync().thenAccept(response -> {
                            Log.i("LND", "GossipSync: " + response);
                            LndModule.gossipSync = false;
                        }).exceptionally(e -> {
                            e.printStackTrace();
                            return null;
                        });
                    }
                    unlock = true;
                    File password = new File(lndPath, "password");
                    FileWriter pwWriter;
                    try {
                        pwWriter = new FileWriter(password);
                        pwWriter.append("moneyprintergobrrr");
                        pwWriter.flush();
                        pwWriter.close();
                        Log.i("LND", "Wrote password file to " + password.getAbsolutePath());
                    } catch (IOException e) {
                        Log.e("LND", "Error writing password file", e);
                    }
                }
                File config = new File(lndPath, "lnd.conf");
                FileWriter writer;
                try {
                    String neutrinoServer = network == "mainnet" ? "btcd.lnolymp.us" : "testnet.lnolymp.us";
                    String backupNeutrinoServer = network == "mainnet" ? "node.blixtwallet.com" : "faucet.lightning.community";
                    String feeURL = network == "mainnet" ? "https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json" : "https://nodes.lightning.computer/fees/v1/btctestnet-fee-estimates.json";
                    writer = new FileWriter(config);
                    StringBuilder sb = new StringBuilder();
                    sb.append("[Application Options]\n")
                            .append("norest=true\n")
                            .append("sync-freelist=true\n")
                            .append("accept-keysend=true\n")
                            .append("tlsdisableautofill=true\n\n");
                    if (unlock) {
                        sb.append("wallet-unlock-password-file=").append(lndPath).append("/password\n\n");
                    }
                    sb.append("[gossip]\n")
                            .append("gossip.pinned-syncers=028c589131fae8c7e2103326542d568373019b50a9eb376a139a330c8545efb79a\n\n")
                            .append("[routing]\n")
                            .append("routing.assumechanvalid=true\n\n")
                            .append("[bitcoin]\n")
                            .append("bitcoin.active=true\n")
                            .append("bitcoin." + network + "=true\n")
                            .append("bitcoin.node=neutrino\n")
                            .append("bitcoin.defaultchanconfs=1\n\n")
                            .append("[neutrino]\n")
                            .append("neutrino.addpeer=" + neutrinoServer + "\n")
                            .append("neutrino.addpeer=" + backupNeutrinoServer + "\n")
                            .append("neutrino.persistfilters=true\n\n")
                            .append("[fee]\n")
                            .append("fee.url=" + feeURL + "\n\n")
                            .append("[protocol]\n")
                            .append("protocol.zero-conf=true\n")
                            .append("protocol.option-scid-alias=true\n\n")
                            .append("[routerrpc]\n")
                            .append("routerrpc.estimator=bimodal\n");
                    writer.write(sb.toString());
                    writer.flush();
                    writer.close();
                    Log.i("LND", "Config file written to " + config.getAbsolutePath());
                } catch (IOException e) {
                    Log.e("LND", "Error writing config file", e);
                }
                String args = "--nolisten --lnddir=" + lndPath;
                String rescanFileName = "rescanrequested";
                Path rescanFilePath = Paths.get(lndPath, rescanFileName);
                if (Files.exists(rescanFilePath)) {
                    try {
                        Files.delete(rescanFilePath);
                    } catch (IOException e) {
                        Log.i("LND", "Failed to delete rescanrequested");
                    }
                    args += " --reset-wallet-transactions";
                }
                Log.i("LND", "Starting LND with args " + args);
                Lndmobile.start(args, new lndmobile.Callback() {
                    @Override
                    public void onError(Exception e) {
                        Log.e("LND", "Error starting LNDmobile", e);
                    }

                    @Override
                    public void onResponse(byte[] bytes) {
                        LndModule.lndStarted = true;
                        Log.i("LND", "LNDmobile started");
                        Runnable transactions = new Runnable() {
                            @Override
                            public void run() {
                                LightningOuterClass.InvoiceSubscription request = LightningOuterClass.InvoiceSubscription
                                        .newBuilder().build();
                                try {
                                    Thread.sleep(9000);
                                } catch (InterruptedException e) {
                                    e.printStackTrace();
                                }
                                Log.i("LND", "Subscribing to invoices");
                                Lndmobile.subscribeInvoices(request.toByteArray(),
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
                                Lndmobile.routerTrackPayments(request.toByteArray(),
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
