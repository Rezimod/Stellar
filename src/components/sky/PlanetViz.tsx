export function PlanetViz({ name }: { name: string }) {
  switch (name.toLowerCase()) {
    case 'venus':
      return <div className="planet-venus" />;
    case 'mars':
      return <div className="planet-mars" />;
    case 'jupiter':
      return <div className="planet-jupiter" />;
    case 'saturn':
      return (
        <div className="planet-saturn-wrap">
          <div className="planet-saturn" />
          <div className="planet-ring" />
        </div>
      );
    case 'mercury':
      return <div className="planet-mercury" />;
    case 'moon':
      return <div className="planet-moon" />;
    case 'neptune':
    case 'uranus':
      return <div className="planet-neptune" />;
    default:
      return <div className="planet-mercury" />;
  }
}
