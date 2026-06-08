import CelestialIcon from './CelestialIcon';
import { quiz } from './data';

export default function QuizCard() {
  return (
    <article className="card quiz">
      <div className="quiz__head">
        <span className="card__kicker quiz__kicker">{quiz.kicker}</span>
        <span className="quiz__new">NEW</span>
      </div>
      <div className="quiz__body">
        <span className="quiz__art">
          <CelestialIcon kind="ring" size={40} />
        </span>
        <div className="quiz__text">
          <h4 className="quiz__title">{quiz.title}</h4>
          <p className="quiz__q">{quiz.question}</p>
        </div>
      </div>
      <span className="quiz__meta">{quiz.meta}</span>
      <button type="button" className="quiz__cta">
        ▶ Start quiz
        <span className="quiz__reward">{quiz.reward}</span>
      </button>
    </article>
  );
}
