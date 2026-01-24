// components/pdf/SimplePdfTemplate.jsx
const SimplePdfTemplate = ({ tasks, timer }) => {  
    const styles = {
      page: {
        width: '210mm',
        minHeight: '297mm',
        padding: '20mm',
        backgroundColor: 'white',
        color: 'black',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '12px',
        lineHeight: '1.5'
      },
      header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '10px',
        borderBottom: '2px solid #333'
      },
      title: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#2563eb'
      },
      task: {
        marginBottom: '40px'
      },
      taskTitle: {
        fontSize: '20px',
        color: '#1f2937',
        marginBottom: '15px',
        borderBottom: '1px solid #eee',
        paddingBottom: '5px'
      },
      question: {
        fontSize: '14px',
        color: '#374151',
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderLeft: '4px solid #3498db',
        borderRadius: '4px',
        margin: '10px 0'
      },
      essay: {
        fontSize: '13px',
        lineHeight: '1.6',
        color: '#2d3436',
        backgroundColor: '#f9f9f9',
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        margin: '10px 0'
      },
      words: {
        fontSize: '14px',
        color: '#27ae60',
        fontWeight: 'bold',
        marginTop: '15px',
        textAlign: 'right'
      },
      timer: {
        textAlign: 'center',
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: '2px solid #333',
        fontSize: '18px',
        color: '#e74c3c'
      }
    };
  
    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '24px' }}>📘</span>
            <span style={styles.title}>IELTSCORE</span>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#666' }}>
            <div>Phone: (123) 456-7890</div>
            <div>Telegram: @username</div>
          </div>
        </header>
  
        <div style={{ height: '1px', backgroundColor: '#ddd', margin: '20px 0' }}></div>
  
        <div>
          {tasks.map((task, index) => (
            <section key={index} style={styles.task}>
              <h2 style={styles.taskTitle}>Task {index + 1}: {task.title}</h2>
  
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', color: '#34495e', marginBottom: '8px' }}>
                  Question:
                </h3>
                <p style={styles.question}>{task.question}</p>
              </div>
  
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', color: '#34495e', marginBottom: '8px' }}>
                  Your Essay:
                </h3>
                <div style={styles.essay}>{task.essay}</div>
              </div>
  
              <p style={styles.words}>Words: {task.words_quantity}</p>
            </section>
          ))}
  
          <h3 style={styles.timer}>Time: {timer}</h3>
        </div>
      </div>
    );
  };
  
  export default SimplePdfTemplate;