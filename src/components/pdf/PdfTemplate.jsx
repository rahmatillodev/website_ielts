import "./pdf.css";

const PdfTemplate = ({ tasks, timer }) => {  
  return (
    <div id="pdf-template" className="pdf-page" style={{
      // Явно задаем цвета inline как fallback
      backgroundColor: 'white',
      color: 'black',
      fontFamily: 'Arial, Helvetica, sans-serif'
    }}>
      <header className="pdf-header" style={{
        backgroundColor: 'white',
        color: '#1a1a1a'
      }}>
        <div className="pdf-header-left">
          <div className="pdf-logo">
            <span style={{ 
              fontSize: '24px', 
              marginRight: '10px',
              color: '#2563eb'
            }}>📘</span>
          </div>
          <span className="pdf-title" style={{ color: '#2563eb' }}>
            IELTS Sim
          </span>
        </div>

        <div className="pdf-header-right" style={{ color: '#6b7280' }}>
          <div>Phone: (123) 456-7890</div>
          <div>Telegram: @username</div>
        </div>
      </header>

      <div 
        className="pdf-divider" 
        style={{ backgroundColor: '#d1d5db', height: '1px', margin: '20px 0' }}
      ></div>

      <div className="pdf-tasks">
        {tasks.map((task, index) => (
          <section 
            key={index} 
            className="pdf-task"
            style={{
              marginBottom: '40px',
              backgroundColor: 'white'
            }}
          >
            <h2 
              className="pdf-task-title"
              style={{
                color: '#1f2937',
                fontSize: '20px',
                marginBottom: '15px'
              }}
            >
              Task {index + 1}: {task.title}
            </h2>

            <div className="pdf-task-section">
              <h3 style={{ color: '#374151', fontSize: '16px' }}>Question:</h3>
              <p 
                className="pdf-task-question"
                style={{
                  color: '#374151',
                  backgroundColor: '#f9fafb',
                  padding: '15px',
                  borderLeft: '4px solid #3b82f6',
                  borderRadius: '4px',
                  margin: '10px 0'
                }}
              >
                {task.question}
              </p>
            </div>

            <div className="pdf-task-section">
              <h3 style={{ color: '#374151', fontSize: '16px' }}>Your Essay:</h3>
              <div 
                className="pdf-task-essay"
                style={{
                  color: '#111827',
                  backgroundColor: '#ffffff',
                  padding: '20px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word'
                }}
              >
                {task.essay}
              </div>
            </div>

            <p 
              className="pdf-task-words"
              style={{
                color: '#059669',
                fontWeight: 'bold',
                textAlign: 'right',
                marginTop: '15px'
              }}
            >
              Words: {task.words_quantity}
            </p>
          </section>
        ))}

        <h3 
          className="pdf-timer"
          style={{
            color: '#dc2626',
            textAlign: 'center',
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '2px solid #1a1a1a'
          }}
        >
          Time: {timer}
        </h3>
      </div>
    </div>
  );
};

export default PdfTemplate;
    