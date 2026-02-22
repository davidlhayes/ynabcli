# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

YNAB CLI is a Node.js command-line tool for managing YNAB (You Need A Budget) transactions. It allows for parsing complex transaction strings and automatically categorizing/splitting transactions using abbreviations and tax calculations.

## Common Commands

### Development Commands
```bash
npm test                    # Run all Jest tests
npm test [filename]         # Run specific test file
node index.js [args]        # Run the CLI tool
```

### Testing Individual Modules
```bash
npm test getSplitTransaction.test.js    # Test transaction parsing
npm test checkArguments.test.js         # Test argument parsing
npm test taxTransaction.test.js         # Test tax calculations
```

### CLI Usage Commands
```bash
node index.js help                      # Show help with category abbreviations
node index.js update                    # Update catalogs from YNAB API
node index.js args                      # Show argument format options
node index.js find [amounts...]         # Find matching transactions
node index.js "55.50a32.10hf12.40hw"    # Parse transaction string
```

## Architecture Overview

### Core Flow
1. **Argument Parsing** (`checkArguments.js`) - Processes CLI arguments and determines operation mode
2. **Dictionary Initialization** (`initializeDictionaries.js`) - Loads categories, payees, accounts, and tax rates from JSON catalogs
3. **Transaction Parsing** (`getSplitTransaction.js`) - Parses transaction strings like "55.50a32.10hf" into categorized amounts
4. **Transaction Processing Pipeline**:
   - `indexTransaction.js` - Maps abbreviations to category IDs
   - `taxTransaction.js` - Applies tax calculations
   - `reCategorizeTransaction.js` - Handles category remapping
   - `totalTransaction.js` - Calculates final totals with discounts/gift cards
5. **YNAB Integration** (`updateYnab.js`) - Updates or creates transactions via YNAB API

### Transaction String Format
The tool parses strings like `"55.50a32.10hf12.40hw24.01l5.99pf109.22tot"`:
- `55.50a` = $55.50 for category abbreviated as "a"
- `12.40hw` = $12.40 for category abbreviated as "hw" 
- `109.22tot` = Total transaction amount of $109.22
- `disc` = Discount amount
- `gc` = Gift card amount
- Tax rates can be specified: `tax8.5` = 8.5% sales tax

### Data Structure
- **Categories** (`catalogs/categories.json`) - YNAB categories with custom abbreviations
- **Payees** (`catalogs/payees.json`) - YNAB payees data
- **Accounts** (`catalogs/accounts.json`) - YNAB account information
- **Taxes** (`catalogs/taxes.json`) - Tax rates with abbreviations (tax, gtax, atax, etc.)

### Key Configuration
- `constants.js` (gitignored) contains YNAB API credentials and configuration
- Required constants: `YNAB_BASE_URL`, `YNAB_API_KEY`, `YNAB_BUDGET_ID`, `DEPARTMENT_STORE_CATEGORY_ID`

### Testing Strategy
- Unit tests for core parsing and calculation functions
- Uses Jest testing framework
- Tests validate transaction parsing, argument handling, and mathematical operations
- Amounts are stored internally as integers (multiplied by 1000) for precision

### Error Handling Patterns
- Validation at argument parsing stage
- Dictionary initialization with detailed error messages
- API error handling with response status checking
- User confirmation before making YNAB updates

## File Organization

```
├── index.js                    # Main CLI entry point
├── lib/                        # Core functionality modules
├── catalogs/                   # JSON data files (categories, payees, accounts, taxes)  
├── tests/                      # Jest unit tests
├── constants.js               # API credentials (gitignored)
└── coverage/                  # Test coverage reports
```
