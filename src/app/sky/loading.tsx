export default function SkyLoading() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background: '#030612',
      }}
    />
  );
}
