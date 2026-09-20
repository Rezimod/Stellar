type RuleProps = {
  /** A stronger hairline, for separating a plate's image from its data. */
  strong?: boolean;
  className?: string;
};

/** A 1px hairline, for separating sections inside a panel. */
export default function Rule({ strong = false, className = '' }: RuleProps) {
  return <hr className={`sd-rule ${strong ? 'sd-rule--strong' : ''} ${className}`.trim()} />;
}
