import {useState,useEffect} from "react"
import Create_acc from "./components/Create_acc"
import{useNavigate} from "react-router-dom"
import View_acc from "./components/View_acc"    



function Accounts(){

    const navigate=useNavigate();

    return(
        <main>
            <div>
                <button  onClick={()=>navigate("/accounts/create")}>
                    create account
                </button>
                

                

            </div>
            <div>
                <button onClick={()=>navigate("/accounts/view")}>
                    view accounts
                </button>
            </div>
        </main>
    )
}

export default Accounts