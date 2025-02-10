import React from 'react'
import './Fresh.css';

const Fresh: React.FC = () => {
  return (
      <div className="fresh-container">
        <form id="askForm" action="">
				<textarea autoFocus id="fresh-prompt" rows={3} placeholder="Ask ..."></textarea>
				<button type="submit" id="askBtn">Ask <span id="fresh-note">(Fresh Context)</span></button>
        </form>
        <div id="fresh-response"></div>
      </div>
  );
}

export default Fresh