<template>
	<table>
		<thead>
			<tr>
				<th>PID</th>
				<th>CPU</th>
				<th>MEM</th>
				<th>command</th>
				<th>cwd</th>
			</tr>
		</thead>

		<tbody>
			<tr v-for="process in processes">
				<th>{{ process.pid }}</th>
				<th>{{ process.memory.percent.resident }}</th>
				<th>{{ process.cpu.percent.total }}</th>
				<th>{{ process.cpu.percent.uTime }}</th>
				<th>{{ process.cpu.percent.sTime }}</th>
				<th>{{ process.cpu.percent.cuTime }}</th>
				<th>{{ process.cpu.percent.csTime }}</th>
				<th>{{ process.cpu.percent.blkioTicks }}</th>
				<th>{{ process.cpu.percent.gTime }}</th>
				<th>{{ process.cpu.percent.cgTime }}</th>
				<th>{{ process.command }}</th>
				<th>{{ process.cwd }}</th>
			</tr>
		</tbody>
	</table>
</template>

<script>
	export default {
		props: [
			'processes'
		]
	}
</script>
