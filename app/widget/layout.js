import WidgetLayoutClient from "./WidgetLayoutClient";

/**
 * Inline style runs with the HTML shell so the iframe is transparent before React hydrates.
 * Client layout then clears wrapper backgrounds the same way as before.
 */
export default function WidgetLayout({ children }) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `html,body{background:transparent!important;color-scheme:normal;}`,
        }}
      />
      <WidgetLayoutClient>{children}</WidgetLayoutClient>
    </>
  );
}
