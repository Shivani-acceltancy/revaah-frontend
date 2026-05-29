import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export default class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : "Unexpected app error";
    return { hasError: true, message };
  }

  override componentDidCatch(error: unknown) {
    console.error("App crashed:", error);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            background: "#FAF6F0",
            color: "#2A2017",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div>
            <h2 style={{ marginBottom: "10px" }}>Something went wrong</h2>
            <p style={{ marginBottom: "14px" }}>{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                border: "1px solid #2A2017",
                background: "transparent",
                padding: "10px 14px",
                cursor: "pointer",
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
