import React from 'react';

type FallbackRender = (args: {
  error: Error;
  reset: () => void;
}) => React.ReactNode;

interface Props {
  children: React.ReactNode;
  fallback: FallbackRender;
  resetKey?: number | string;
  onError?: (error: Error) => void;
}

interface State {
  error: Error | null;
}

export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return this.props.fallback({
        error: this.state.error,
        reset: this.reset,
      });
    }

    return this.props.children;
  }
}
