import React, { Suspense } from 'react';
import { View } from 'react-native';

export function createLazyScreen<T extends object>(
  loader: () => Promise<{ default: React.ComponentType<T> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = React.lazy(loader);

  return function LazyWrappedScreen(props: T) {
    return (
      <Suspense fallback={fallback ?? <View style={{ flex: 1 }} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
