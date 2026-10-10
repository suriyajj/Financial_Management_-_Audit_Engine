import {useNavigate} from "react-router-dom";


function Transfer(){
    const navigate=useNavigate();
    return(

        <main>
            <div>
                <button onClick={()=>navigate("/transfer/create_tran")} >
                    Create Transaction
                </button>

            </div>
            <div>
                <button onClick={()=>navigate("/transfer/view_tran")}>
                    View Transaction
                </button>
            </div>
        </main>
    )
}
export default Transfer