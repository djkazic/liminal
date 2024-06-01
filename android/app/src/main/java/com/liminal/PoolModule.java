package com.liminal;

import android.content.Intent;
import android.util.Log;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.graphics.Color;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import litdmobile.Callback;
import litdmobile.Litdmobile;
import litdmobile.RecvStream;
import litdmobile.SendStream;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;

import com.facebook.react.modules.core.DeviceEventManagerModule;

import com.google.protobuf.ByteString;
import com.google.protobuf.InvalidProtocolBufferException;

import com.jakewharton.processphoenix.ProcessPhoenix;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.io.UnsupportedEncodingException;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.Files;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;

import litdmobile.Callback;

import poolrpc.Auctioneer;
import poolrpc.TraderOuterClass;

public class PoolModule extends ReactContextBaseJavaModule {
    public static boolean poolStarted;
    public static ReactApplicationContext reactContext;

    public PoolModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "PoolModule";
    }

    private void sendEvent(String eventName, @Nullable WritableMap params) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params);
        }
    }

    @ReactMethod
    public void isRunning(Promise promise) {
        promise.resolve(poolStarted);
    }

    @ReactMethod
    public void initAccount(Promise promise) {
        try {
            TraderOuterClass.InitAccountRequest request = serializeInitAccountRequest(200_000);
            Litdmobile.traderInitAccount(request.toByteArray(), new litdmobile.Callback() {
                @Override
                public void onError(Exception e) {
                    Log.e("POOL", "Error initaccount", e);
                    promise.reject("ERR_POOL_INIT_ACCOUNT", e);
                }

                @Override
                public void onResponse(byte[] bytes) {
                    try {
                        TraderOuterClass.Account response = TraderOuterClass.Account.parseFrom(bytes);
                        ByteString traderKeyByteString = response.getTraderKey();
                        String traderKey = traderKeyByteString.toStringUtf8();
                        String responseString = "Account " + traderKey + " of " + 
                            response.getAvailableBalance() + " sats created successfully!";
                        promise.resolve(responseString);
                    } catch (InvalidProtocolBufferException e) {
                        promise.reject("ERR_POOL_INIT_ACCOUNT", "Failed to initaccount: " + e.getMessage(), e);
                    }
                }
            });
        } catch (Exception e) {
            promise.reject("ERR_POOL_INIT_ACCOUNT", "Failed to initaccount: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void listAccounts(Promise promise) {
        try {
            TraderOuterClass.ListAccountsRequest request = serializeListAccountRequest();
            Litdmobile.traderListAccounts(request.toByteArray(), new litdmobile.Callback() {
                @Override
                public void onError(Exception e) {
                    Log.e("POOL", "Error listaccounts", e);
                    promise.reject("ERR_POOL_LIST_ACCOUNTS", e);
                }

                @Override
                public void onResponse(byte[] bytes) {
                    try {
                        WritableArray accountsArray = Arguments.createArray();
                        if (bytes != null) {
                            TraderOuterClass.ListAccountsResponse response = TraderOuterClass.ListAccountsResponse.parseFrom(bytes);
                            for (TraderOuterClass.Account account : response.getAccountsList()) {
                                WritableMap accountMap = Arguments.createMap();
                                ByteString traderKeyByteString = account.getTraderKey();
                                String traderKey = traderKeyByteString.toStringUtf8();
                                accountMap.putString("traderKey", traderKey);
                                accountMap.putDouble("availableBalance", account.getAvailableBalance());
                                accountMap.putDouble("value", account.getValue());
                                accountMap.putString("outpoint", account.getOutpoint().getTxid() + ":" + account.getOutpoint().getOutputIndex());
                                accountsArray.pushMap(accountMap);
                            }
                        }
                        promise.resolve(accountsArray);
                    } catch (InvalidProtocolBufferException e) {
                        promise.reject("ERR_POOL_LIST_ACCOUNTS", e);
                    }
                }
            });
        } catch (Exception e) {
            promise.reject("ERR_POOL_LIST_ACCOUNTS", "Failed to listaccounts: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void leases(Promise promise) {
        try {
            TraderOuterClass.LeasesRequest request = serializeLeasesRequest();
            Litdmobile.traderLeases(request.toByteArray(), new litdmobile.Callback() {
                @Override
                public void onError(Exception e) {
                    Log.e("POOL", "Error leases", e);
                    promise.reject("ERR_POOL_LEASES", e);
                }

                @Override
                public void onResponse(byte[] bytes) {
                    try {
                        WritableArray leasesArray = Arguments.createArray();
                        if (bytes != null) {
                            TraderOuterClass.LeasesResponse response = TraderOuterClass.LeasesResponse.parseFrom(bytes);
                            for (TraderOuterClass.Lease lease : response.getLeasesList()) {
                                WritableMap leaseMap = Arguments.createMap();
                                leaseMap.putString("channelPoint", lease.getChannelPoint().getTxid() + ":" + lease.getChannelPoint().getOutputIndex());
                                leaseMap.putDouble("channelAmount", lease.getChannelAmtSat());
                                leaseMap.putDouble("channelDurationBlocks", lease.getChannelDurationBlocks());
                                leaseMap.putDouble("channelLeaseExpiry", lease.getChannelLeaseExpiry());
                                leaseMap.putDouble("premium", lease.getPremiumSat());
                                leaseMap.putDouble("executionFee", lease.getExecutionFeeSat());
                                leaseMap.putDouble("chainFee", lease.getChainFeeSat());
                                leaseMap.putDouble("clearingRatePrice", lease.getClearingRatePrice());
                                leaseMap.putDouble("orderFixedRate", lease.getOrderFixedRate());
                                leaseMap.putBoolean("purchased", lease.getPurchased());
                                ByteString channelRemoteNodeKeyByteString = lease.getChannelRemoteNodeKey();
                                String channelRemoteNodeKey = channelRemoteNodeKeyByteString.toStringUtf8();
                                leaseMap.putString("channelRemoteNodeKey", channelRemoteNodeKey);
                                leaseMap.putDouble("channelNodeTier", lease.getChannelNodeTierValue());
                                leaseMap.putDouble("selfChanBalance", lease.getSelfChanBalance());
                                leaseMap.putBoolean("sidecarChannel", lease.getSidecarChannel());
                                leasesArray.pushMap(leaseMap);
                            }
                        }
                        promise.resolve(leasesArray);
                    } catch (InvalidProtocolBufferException e) {
                        promise.reject("ERR_POOL_LEASES", e);
                    }
                }
            });
        } catch (Exception e) {
            promise.reject("ERR_POOL_LEASES", "Failed to leases: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void quoteOrderRequest(Promise promise) {
        try {
            TraderOuterClass.QuoteOrderRequest request = serializeQuoteOrderRequest();
            Litdmobile.traderQuoteOrder(request.toByteArray(), new litdmobile.Callback() {
                @Override
                public void onError(Exception e) {
                    Log.e("POOL", "Error quote", e);
                    promise.reject("ERR_POOL_QUOTE_ORDER", e);
                }

                @Override
                public void onResponse(byte[] bytes) {
                    try {
                        WritableMap resultMap = Arguments.createMap();
                        if (bytes != null) {
                            TraderOuterClass.QuoteOrderResponse response = TraderOuterClass.QuoteOrderResponse.parseFrom(bytes);
                            resultMap.putDouble("totalPremium", response.getTotalPremiumSat());
                            resultMap.putDouble("ratePerBlock", response.getRatePerBlock());
                            resultMap.putDouble("ratePercent", response.getRatePercent());
                            resultMap.putDouble("totalExecutionFee", response.getTotalExecutionFeeSat());
                            resultMap.putDouble("worstCaseChainFee", response.getWorstCaseChainFeeSat());
                        }
                        promise.resolve(resultMap);
                    } catch (InvalidProtocolBufferException e) {
                        promise.reject("ERR_POOL_QUOTE_ORDER", e);
                    }
                }
            });
        } catch (Exception e) {
            promise.reject("ERR_POOL_QUOTE_ORDER", "Failed to quoteorder: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void submitOrder(Promise promise) {
        try {
            TraderOuterClass.SubmitOrderRequest request = serializeSubmitOrderRequest();
            Litdmobile.traderSubmitOrder(request.toByteArray(), new litdmobile.Callback() {
                @Override
                public void onError(Exception e) {
                    Log.e("POOL", "Error submit", e);
                    promise.reject("ERR_POOL_SUBMIT_ORDER", e);
                }

                @Override
                public void onResponse(byte[] bytes) {
                    try {
                        WritableMap resultMap = Arguments.createMap();
                        if (bytes != null) {
                            TraderOuterClass.SubmitOrderResponse response = TraderOuterClass.SubmitOrderResponse.parseFrom(bytes);
                            Auctioneer.InvalidOrder invalidOrder = response.getInvalidOrder();
                            ByteString invalidOrderNonceByteString = invalidOrder.getOrderNonce();
                            String invalidOrderNonce = invalidOrderNonceByteString.toStringUtf8();
                            resultMap.putString("invalidOrderNonce", invalidOrderNonce);
                            resultMap.putString("invalidOrderFailReason", invalidOrder.getFailString());
                            ByteString acceptedOrderNonceByteString = response.getAcceptedOrderNonce();
                            String acceptedOrderNonce = acceptedOrderNonceByteString.toStringUtf8();
                            resultMap.putString("acceptedOrderNonce", acceptedOrderNonce);
                        }
                        promise.resolve(resultMap);
                    } catch (InvalidProtocolBufferException e) {
                        promise.reject("ERR_POOL_SUBMIT_ORDER", e);
                    }
                }
            });
        } catch (Exception e) {
            promise.reject("ERR_POOL_SUBMIT_ORDER", "Failed to submitorder: " + e.getMessage(), e);
        }
    }

    private TraderOuterClass.InitAccountRequest serializeInitAccountRequest(long accountValue) {
        TraderOuterClass.InitAccountRequest.Builder builder = TraderOuterClass.InitAccountRequest.newBuilder();
        builder.setInitiator("liminal");
        builder.setAccountValue(accountValue);
        builder.setConfTarget(6);
        return builder.build();
    }

    private TraderOuterClass.ListAccountsRequest serializeListAccountRequest() {
        TraderOuterClass.ListAccountsRequest.Builder builder = TraderOuterClass.ListAccountsRequest.newBuilder();
        builder.setActiveOnly(true);
        return builder.build();
    }

    private TraderOuterClass.LeasesRequest serializeLeasesRequest() {
        TraderOuterClass.LeasesRequest.Builder builder = TraderOuterClass.LeasesRequest.newBuilder();
        return builder.build();
    }

    private TraderOuterClass.QuoteOrderRequest serializeQuoteOrderRequest() {
        TraderOuterClass.QuoteOrderRequest.Builder builder = TraderOuterClass.QuoteOrderRequest.newBuilder();
        builder.setAmt(1_000_000);
        builder.setRateFixed(10_000);
        builder.setLeaseDurationBlocks(4032);
        builder.setMaxBatchFeeRateSatPerKw(25_000);
        builder.setMinUnitsMatch(10);
        return builder.build();
    }

    private TraderOuterClass.SubmitOrderRequest serializeSubmitOrderRequest() {
        TraderOuterClass.Bid.Builder bidBuilder = TraderOuterClass.Bid.newBuilder();
        bidBuilder.setLeaseDurationBlocks(2016);
        bidBuilder.setMinNodeTierValue(2);
        bidBuilder.setUnannouncedChannel(true);
        TraderOuterClass.Bid bid = bidBuilder.build();
        TraderOuterClass.SubmitOrderRequest.Builder builder = TraderOuterClass.SubmitOrderRequest.newBuilder();
        builder.setBid(bid);
        return builder.build();
    }
}
