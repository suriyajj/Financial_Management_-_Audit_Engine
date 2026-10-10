import ProtectedRoute from "./ProtectedRoutes"
import {Routes,Route} from "react-router-dom"
import Login from "../pages/auth/Login"
import Dashboard from "../pages/dashboard/dashboard"
import Accounts from "../pages/accounts/Accounts"
import Create_acc from "../pages/accounts/components/Create_acc"
import View_acc from "../pages/accounts/components/View_acc"
import Transfer from "../pages/transfer/Transfer"
import Create_trans from "../pages/transfer/components/Create_trans"
import View_trans from "../pages/transfer/components/View_trans"
import Log from "../pages/logs/Log"
import Activity from "../pages/logs/components/Activity"
import Error_Log from "../pages/logs/components/Error_Logs"
import Events from "../pages/logs/components/Events"




function AppRoutes(){
    return(

        <Routes>
            <Route path="/" element={<Login/>}/>
            <Route path="/login" element={<Login/>}/>
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>}/>
            <Route path="/accounts" element={<ProtectedRoute><Accounts/></ProtectedRoute>}/>
            <Route path="/accounts/create" element={<ProtectedRoute><Create_acc/></ProtectedRoute>}/>
            <Route path="/accounts/view" element={<ProtectedRoute><View_acc/></ProtectedRoute>}/>
            <Route path="/transfer" element={<ProtectedRoute><Transfer/></ProtectedRoute>}/>
            <Route path="/transfer/create_tran" element={<ProtectedRoute><Create_trans/></ProtectedRoute>}/>
            <Route path="/transfer/view_tran" element={<ProtectedRoute><View_trans/></ProtectedRoute>}/>
            <Route path="/logs" element={<ProtectedRoute><Log/></ProtectedRoute>}/>
            <Route path="/logs/activity" element={<ProtectedRoute><Activity/></ProtectedRoute>}/>
            <Route path="/logs/errors" element={<ProtectedRoute><Error_Log/></ProtectedRoute>}/>
            <Route path="/logs/events" element={<ProtectedRoute><Events/></ProtectedRoute>}/>
         


        </Routes>




    )
}

export default AppRoutes