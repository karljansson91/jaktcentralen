# Dependency patches

## `react-native-css-interop@0.2.4`

Metro in the Expo SDK 56 toolchain expects file-map change events to include a
`changes` object with `addedFiles`, `modifiedFiles`, and `removedFiles`.
`react-native-css-interop@0.2.4` still emits the older `eventsQueue` shape when
NativeWind refreshes its generated CSS module, which crashes Metro with:

`TypeError: Cannot read properties of undefined (reading 'addedFiles')`

Keep `react-native-css-interop+0.2.4.patch` until NativeWind / CSS interop ships
the same event-shape fix upstream, then remove the patch and `patch-package`.
