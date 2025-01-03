import { useState, useEffect } from "react";


function Greeting() {
    const [count, setCount] = useState(0)
    
    const increment = () => setCount(count+1)
    const decrement = () => setCount(count-1)
    
    return(
    <div>
      <h1>Count: {count}</h1>
      <button onClick={increment}>Up !</button>
      <button onClick={decrement}>Down !</button>
      <UseEffect/>
    </div>
    )
  }

  function UseEffect(){
    useEffect(() => console.log("Mounting..."));
    return <h1>Geeks ... !</h1>

  }


export default Greeting