import { useState } from "react";

function Child(props) {return <h1><props.data/></h1>}

function Prop(){
    const [change, setChange] = useState(true)

    const Negate = () => {setChange(!change)}

    return (
        <div>
            <button onClick={Negate}>Click to Switch</button>
            {change ? <p>Positive</p>: <p>Negative</p>}
        </div>
    )
}

export default Prop