<script>
	let x = 1;
	let pa = ["", "", "", "", "", "", "", "", "", ""];
	let endGame = "";
	let winner = "";

	function checkWin(){
		if(pa[1] == pa[2] && pa[2] == pa[3] && pa[3] != "") endGame = "win";
		else if(pa[4] == pa[5] && pa[5] == pa[6] && pa[6] != "") endGame = "win";
		else if(pa[7] == pa[8] && pa[8] == pa[9] && pa[9] != "") endGame = "win";
		else if(pa[1] == pa[4] && pa[4] == pa[7] && pa[7] != "") endGame = "win";
		else if(pa[2] == pa[5] && pa[5] == pa[8] && pa[8] != "") endGame = "win";
		else if(pa[3] == pa[6] && pa[6] == pa[9] && pa[9] != "") endGame = "win";
		else if(pa[1] == pa[5] && pa[5] == pa[9] && pa[9] != "") endGame = "win";
		else if(pa[3] == pa[5] && pa[5] == pa[7] && pa[7] != "") endGame = "win";
		else if(pa[1] != "" && pa[2] != "" && pa[3] != "" && pa[4] != "" && pa[5] != ""
		&& pa[6] != "" && pa[7] != "" && pa[8] != "" && pa[9] != "") endGame = "draw"
		
		if(x == 1) winner = "first player";
		else winner = "second player";
		
	}
	function fq(a){
		if(endGame === "" && pa[a] === ""){
			if(x == 1) pa[a] = "first player";
			else pa[a] = "second player";
			checkWin();
			x = 3 - x;
		}
	}
	function reset(){
		for(let i = 1; i <= 9; i++){
			pa[i] = "";
		}
		endGame = "";
		winner = "";
		x = 1;
	}
</script>

<main>
	{#if endGame != ""}
		<h1>game is over,</h1>
		{#if endGame === "win"}
			<h1 class="w">winner is {winner}!</h1>
		{:else}
			<h1 class="w">it is a draw</h1>
		{/if}
		<button class = "resetBtn" on:click={() => reset()}>play again!</button>
	{:else if x === 1}
		<h1>current player : first player</h1>
	{:else}
		<h1>current player : second player</h1>
	{/if}
	<table>
		<tr>
			<td on:click={() => fq(1)}>{pa[1]}</td>
			<td on:click={() => fq(2)}>{pa[2]}</td>
			<td on:click={() => fq(3)}>{pa[3]}</td>
		</tr>
		<tr>
			<td on:click={() => fq(4)}>{pa[4]}</td>
			<td on:click={() => fq(5)}>{pa[5]}</td>
			<td on:click={() => fq(6)}>{pa[6]}</td>
		</tr>
		<tr>
			<td on:click={() => fq(7)}>{pa[7]}</td>
			<td on:click={() => fq(8)}>{pa[8]}</td>
			<td on:click={() => fq(9)}>{pa[9]}</td>
		</tr>
	</table>
</main>
	
<style>
	h1{
		position : absolute;
		left : 10px;
		top : 10px;
	}
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}
	table, tr, td{	
		border : 1px solid black;
		border-collapse: collapse;
	}
	table{
		margin-top : 100px;
		width: 36%;
	}
	tr{
		height : 150px;
	}
	td{
		width: 12%;
	}
	.w{
		position: absolute;
		left : 215px;
	}
	.resetBtn{
		position: absolute;
		left : 700px;
		top : 100px;
	}
	

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>