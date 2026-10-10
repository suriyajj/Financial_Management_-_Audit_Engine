import { useState, useEffect } from "react";
import { apiFetch } from "../../../utils/api";

function View_acc() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function FetchAccount() {
        setLoading(true);
        setError(null);

        try {
            const response = await apiFetch("/api/account/list", {
                method: "GET",
            });
            const data = await response.json();

            if (response.ok) {
                setAccounts(data.data || []);
            } else {
                throw new Error(data.message || "Failed to fetch accounts");
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(()=>{
        FetchAccount();
    },[])





    
    return(

        <main>
            <h2>
                Accounts Details
            </h2>
            {loading &&(<p>Loading Accounts</p>)

            }
            {
                error && (<div>
                    <p>Error:{error}</p>
                    <button onClick={FetchAccount}>Retry</button>
                </div>
                ) }

                {!loading && !error && accounts.length===0 &&(
                    <p>No accounts found</p>
                    
                )}

                {
                    !loading && !error && accounts.length>0 &&(
                        <div>
                            {accounts.map((account)=>(
                                <div key={account.id}>
                                    <p><strong>Account Number:</strong>{account.account_number}</p>
                                    <p><strong>Balance:</strong>{account.balance}</p>
                                    <p><strong>User:</strong>{"  "+account.owner_name +"    - "+account.owner_id}</p>
                                    <p><strong>Created At:</strong>{new Date(account.created_at).toLocaleString()}</p>
                                    <p>----------------------------------------------------------------------------------------</p>
                                </div>
                            ))}
                        </div>
                    )
                }
            
            

        </main>
    )
}
export default View_acc;