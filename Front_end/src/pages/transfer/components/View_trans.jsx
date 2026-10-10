import { useState, useEffect } from "react";
import { apiFetch } from "../../../utils/api";

function View_trans() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    async function fetchTransactions() {
        setLoading(true);
        setError(null);

        try {
            const response = await apiFetch("/account/transactions", {
                method: "GET",
            });

            const data = await response.json();

            if (response.ok) {
                setTransactions(data.data || []);
            } else {
                throw new Error(
                    data.message || "Failed to fetch transactions"
                );
            }
        } catch (err) {
            console.error("Error fetching transactions:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchTransactions();
    }, []);

    return (
        <main>
            <h2>Transaction History</h2>

            {loading && (
                <p>Loading transactions...</p>
            )}

            {error && (
                <div>
                    <p>Error: {error}</p>

                    <button onClick={fetchTransactions}>
                        Retry
                    </button>
                </div>
            )}

            {!loading && !error && transactions.length === 0 && (
                <p>No transactions found.</p>
            )}

            {!loading && !error && transactions.length > 0 && (
                <div>
                    {transactions.map((transaction) => (
                        <div key={transaction.id}>
                            <p>
                                <strong>Transaction ID:</strong>{" "}
                                {transaction.id}
                            </p>

                            <p>
                                <strong>Amount:</strong>{" "}
                                {transaction.amount}{" "}
                                {transaction.currency}
                            </p>

                            <p>
                                <strong>Status:</strong>{" "}
                                {transaction.status}
                            </p>

                            <p>
                                <strong>From User:</strong>{" "}
                                {transaction.from_user}{" "}
                                ({transaction.from_account})
                            </p>

                            <p>
                                <strong>To User:</strong>{" "}
                                {transaction.to_user}{" "}
                                ({transaction.to_account})
                            </p>

                            <p>
                                <strong>Date:</strong>{" "}
                                {new Date(
                                    transaction.created_at
                                ).toLocaleString()}
                            </p>
                            <p>{"----------------------------------------------------------------------------------------"}</p>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}

export default View_trans;