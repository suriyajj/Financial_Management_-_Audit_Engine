import {useState } from "react"
import {useNavigate} from "react-router-dom"



function Login(){

    const[email,setEmail]=useState("");
    const[password,setPassword]=useState("");
    const[loading,setLoading]=useState(false);
    const navigate=useNavigate();

    

    async function LoginHandler(event){
        event.preventDefault();
        setLoading(true);

        try{
            const response=await fetch("http://localhost:3001/auth/login",{
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },credentials:"include",
                body:JSON.stringify({
                    email:email,
                    password:password
                })
            });
            const data=await response.json();

            if(response.ok){
                navigate("/dashboard")
            }else{
                throw new Error(data.message || "login failed")
                
            }
            
        }catch(error){
            console.error(error);

        }finally{
            setLoading(false)
        }



    }

    



    return(



        <main>

            <h3>Login Page</h3>

            <form onSubmit={LoginHandler}>

                <div>
                    <label htmlFor="email">
                        Email
                    </label>
                    <input id="email" type="email" placeholder="example@gmail.com" onChange={(event)=>setEmail(event.target.value)} required/>
                </div>
                <div>

                    <label htmlFor="password">
                        Password
                    </label>
                    <input id="password" type="password" placeholder="Enter your password" onChange={(event)=>setPassword(event.target.value)} required/>
                </div>

                <button type="submit" disabled={loading}>{loading?"logging in":"Login"}</button>


            </form>






        </main>
    )
}

export default Login