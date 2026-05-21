<?php

use App\Http\Controllers\ProductController;
use App\Http\Controllers\OrderController;
use Illuminate\Support\Facades\Route;

/*
 * Edge cases exercised:
 *   - Nested Route::group(['prefix' => ...]) with concatenated prefixes
 *   - Middleware applied at the group level ('auth:api')
 *   - FormRequest-backed controller methods (ProductController::store)
 *   - PATCH on a sub-path (/orders/{id}/status)
 */

Route::group(['prefix' => 'v1', 'middleware' => []], function () {
    Route::group(['prefix' => 'products', 'middleware' => ['auth:api']], function () {
        Route::get('/', [ProductController::class, 'index']);
        Route::post('/', [ProductController::class, 'store']);
        Route::get('/{id}', [ProductController::class, 'show']);
        Route::put('/{id}', [ProductController::class, 'update']);
        Route::delete('/{id}', [ProductController::class, 'destroy']);
    });

    Route::group(['prefix' => 'orders', 'middleware' => ['auth:api']], function () {
        Route::get('/', [OrderController::class, 'index']);
        Route::post('/', [OrderController::class, 'store']);
        Route::get('/{id}', [OrderController::class, 'show']);
        Route::patch('/{id}/status', [OrderController::class, 'updateStatus']);
    });
});
