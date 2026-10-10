import { useState } from "react";
import { apiFetch } from "../../../utils/api";

function Create_trans() {
    const [fromAccount, setFromAccount] = useState("");
    const [toAccount, setToAccount] = useState("");
    const [amount, setAmount] = useState(0);

    async function HandleSubmit(event) {
        event.preventDefault();

        try {
            const res = await apiFetch("/account/transfer", {
                method: "POST",
                body: JSON.stringify({
                    fromAccountNumber: fromAccount,
                    toAccountNumber: toAccount,
                    amount: Number(amount),
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setFromAccount("");
                setToAccount("");
                setAmount(0);
                alert("Transfer successfull");
            } else {
                console.log(error.message)
            }
        } catch (error) {
            console.error("Transfer error:", error);
            
        }
    }


    return(
        <main>

            <form onSubmit={HandleSubmit}>
                <div>
                    <label htmlFor="FromAccount">
                        FromAccount:
                    </label>
                    <input placeholder="From acc number" id="FromAccount" value={fromAccount} onChange={(e)=>setFromAccount(e.target.value)}>

                    </input>
                </div>
                <div>
                    <label htmlFor="ToAccount">
                        ToAccount:
                    </label>
                    <input placeholder="To acc number" id="ToAccount" value={toAccount} onChange={(e)=>setToAccount(e.target.value)}>

                    </input>
                </div>
                <div>
                    <label htmlFor="Amount">
                        Amount:
                    </label>
                    <input placeholder="Amount" id="Amount" value={amount} onChange={(e)=>setAmount(e.target.value)}>

                    </input>
                </div>
                <button type="submit">Transfer</button>

                
            </form>
            
        </main>
    )
}
export default Create_trans