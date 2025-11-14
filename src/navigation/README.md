# Navigation Structure

This directory contains the navigation configuration for the Animal Rescue mobile app.

## Structure

- **TabNavigator.js**: Bottom tab navigation with three main screens
  - Report: For reporting animals in need
  - Cases: For viewing active rescue cases
  - Profile: For user profile and settings

## Navigation Flow

```
App.js (Root)
  └── NavigationContainer
      └── TabNavigator (Bottom Tabs)
          ├── ReportScreen
          ├── CasesScreen
          └── ProfileScreen
```

## Features

- Bottom tab navigation with emoji icons
- Themed header bars
- Consistent styling across all screens
- Error boundary wrapping for crash protection

## Future Enhancements

- Stack navigation for case details
- Authentication flow
- Deep linking support
- Push notification navigation
