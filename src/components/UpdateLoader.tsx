import './UpdatePopup.css';

export default function UpdateLoader() {
  return (
    <div className="update-loader-overlay">
      <div className="typewriter">
        <div className="slide"><i></i></div>
        <div className="paper"></div>
        <div className="keyboard"></div>
      </div>
      <p className="update-loader-text">Aggiornamento in corso...</p>
      <p className="update-loader-subtext">L'app si riavvierà automaticamente</p>
    </div>
  );
}
