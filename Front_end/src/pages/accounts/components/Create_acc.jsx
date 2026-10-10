import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../../utils/api";

function Create_acc() {
    const navigate = useNavigate();
    const [initialBalance, setInitialbalance] = useState(0);
    const [loading, setLoading] = useState(false);

    async function HandleSubmit(event) {
        event.preventDefault();
        setLoading(true);

        try {
            const response = await apiFetch("/api/account/create", {
                method: "POST",
                body: JSON.stringify({
                    initialBalance:initialBalance,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setInitialbalance(0);
                alert("Account created successfully");
            
            } else {
                throw new Error(data.message || "Account creation failed");
            }
        } catch (error) {
            console.error("Error creating account:", error);
            
        } finally {
            setLoading(false);
        }
    }



    
    return(
        <main>
            <form onSubmit={HandleSubmit}>
                <div>
                    <label htmlFor="initialBalance">
                        Initial Balance:
                    </label>
                    <input type="number" id="initialBalance" placeholder="Enter amaount" value={initialBalance} onChange={(e)=>setInitialbalance(e.target.value)}>
                    </input>
                </div>
                <button type="submit" disabled={loading} onClick={()=>navigate("/accounts/create")}>
                    {loading ? "Creating..." : "Create"}
                </button>
            </form>
        </main>
    )
}


export default Create_acc