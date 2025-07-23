#!/usr/bin/env python3
"""
openai_schema.py - Simplified Receipt JSON Schema
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Streamlined schema focusing on essential fields only:
- Vendor Name, Date, Total Amount, Tax Amount, Type
"""

# Simplified receipt schema - essential fields only
UK_RECEIPT_JSON_SCHEMA = {
    "type": "object",
    "required": ["vendor_name", "total_amount", "transaction_date"],
    "properties": {
        "vendor_name": {
            "type": "string",
            "description": "Name of the store/merchant (extract as simple text)"
        },
        "transaction_date": {
            "type": "string",
            "description": "Date of transaction in YYYY-MM-DD format"
        },
        "total_amount": {
            "type": "number",
            "minimum": 0,
            "description": "Total amount paid (as decimal number, no currency symbols)"
        },
        "tax_amount": {
            "type": ["number", "null"],
            "minimum": 0,
            "description": "Tax/VAT amount if visible on receipt (null if not shown)"
        },
        "transaction_type": {
            "type": "string",
            "enum": ["expense", "income"],
            "description": "Whether this is an expense (purchase) or income (refund/payment received)",
            "default": "expense"
        },
        "currency": {
            "type": "string",
            "enum": ["GBP", "USD", "EUR"],
            "default": "GBP",
            "description": "Currency code"
        }
    }
}
