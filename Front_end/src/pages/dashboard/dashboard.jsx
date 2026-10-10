
import {useState,useEffect} from "react"
import { useNavigate } from "react-router-dom"

function Dashboard(){
    const navigate=useNavigate();

    const[events,setEvents]=useState([]);
    const[connected,setConnected]=useState(false);

    useEffect(()=>{
        const eventSource=new EventSource("http://localhost:3001/logs/stream",
            {
                withCredentials:true
            }
        );

        eventSource.onopen=()=>{
            setConnected(true);
            console.log("Connected to the SSE stream");
        }

        eventSource.onmessage=(event)=>{
            try{
                const data=JSON.parse(event.data);
                setEvents((prevEvents)=>[data,...prevEvents])
            }catch(error){
                console.error("Failed to parse SSE message",error);
            }
        }

        return()=>{
            eventSource.close();
        };
        
    },[])
    

    return(


        <main>

            <div>
                <button onClick={()=>navigate("/accounts")}>
                    Accounts
                </button>
            </div>
            <div>
                <button onClick={()=>navigate("/transfer")}>
                    Money Transaction
                </button>
            </div>

            <div>
                <button onClick={()=>navigate("/logs")}>
                    Logs
                </button>
            </div>

            <div className="sse-container">
                <h3>Live SSE Stream</h3>
                <p className="connection-status">
                    Connection Status:{" "}
                    <span className={connected ? "status-online" : "status-offline"}>
                        <span className="status-dot"></span>
                        {connected ? "Connected" : "Disconnected"}
                    </span>
                </p>

                <section className="live-logs-section">
                    <h3>Live Transaction Logs</h3>

                    {events.length === 0 ? (
                        <p className="empty-logs">No live logs received yet. Perform an action to see real-time updates...</p>
                    ) : (
                        <div className="live-logs-list">
                            {events.map((log, index) => (
                                <div
                                    key={log._id || log.id || index}
                                    className="live-log-card"
                                >
                                    {log.eventType && (
                                        <p>
                                            <strong>Event:</strong> {log.eventType}
                                        </p>
                                    )}

                                    {log.message && (
                                        <p>
                                            <strong>Message:</strong> {log.message}
                                        </p>
                                    )}

                                    <p>
                                        <strong>Date:</strong>{" "}
                                        {log.createdAt || log.created_at || log.timestamp
                                            ? new Date(
                                                  log.createdAt || log.created_at || log.timestamp
                                              ).toLocaleString()
                                            : "N/A"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>




            
        </main>
    )
}
export default Dashboard