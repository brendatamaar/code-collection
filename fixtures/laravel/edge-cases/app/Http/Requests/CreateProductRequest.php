<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * FormRequest with nested validation rules.
 * Tests that the parser extracts top-level and nested fields.
 */
class CreateProductRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name'              => ['required', 'string', 'max:255'],
            'price'             => ['required', 'numeric', 'min:0'],
            'category_id'       => ['required', 'integer'],
            'description'       => ['nullable', 'string'],
            'stock'             => ['required', 'integer', 'min:0'],
            'metadata.color'    => ['nullable', 'string'],
            'metadata.weight'   => ['nullable', 'numeric'],
            'tags'              => ['nullable', 'array'],
            'tags.*'            => ['string', 'max:50'],
        ];
    }
}
