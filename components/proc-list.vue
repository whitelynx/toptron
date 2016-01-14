<style lang="less">
	.clickable {
		cursor: pointer;
	}

	.menuButton {
		//float: right;
		position: fixed;
		top: 0;
		right: 0;
		font-size: smaller;
		padding: 0.5em;
		position: relative;
		.clickable();

		&:hover {
			background-color: #222;
		}

		.menu {
			margin: 0;
			padding-left: 0;
			list-style-type: none;

			li.checkable {
				white-space: nowrap;

				&::before {
					display: inline-block;
					width: 1em;
					height: 1em;
					margin-right: 0.5em;
					border: 1px solid white;
					text-align: center;
					vertical-align: middle;
					content: ' ';
				}

				&.checked::before {
					content: '✓';
				}
			}
		}
	}

	div.processList {
		//max-width: 100%;
		overflow: auto;
		font-family: monospace;

		table {
			th:nth-child(2n), td:nth-child(2n), thead tr:nth-child(2n+1), tbody tr:nth-child(2n) {
				background-color: rgba(31, 31, 31, 0.5);
			}

			th {
				font-size: small;
				white-space: nowrap;

				&.sortAsc::after {
					display: inline-block;
					margin: -1px 0 -1px 0.25em;
					padding: 0;
					font-size: smaller;
					content: ' ⏶';
				}
				&.sortDesc::after {
					display: inline-block;
					margin: -1px 0 -1px 0.25em;
					padding: 0;
					font-size: smaller;
					content: ' ⏷';
				}
			}

			td {
				font-size: smaller;
				max-width: 100em;
				max-height: 1em;
				white-space: nowrap;
				overflow: hidden;
			}
		}
	}
</style>

<template>
	<div class="menuButton">
		☰<!--&U2630;-->

		<tooltip class="right aligned">
			<ul class="menu">
				<li v-for="column in columns" class="checkable" :class="{ checked: column.enabled }"
					@click="column.enabled = !column.enabled">{{ column.title }}</li>
			</ul>
		</tooltip>
	</div>
	<div class="processList">
		<table>
			<thead>
				<tr>
					<th v-for="column in columns" v-if="column.enabled" class="clickable"
						:class="{ sortAsc: sortKey == column.key && sortOrder > 0, sortDesc: sortKey == column.key && sortOrder < 0 }"
						@click="setSort(column.key)">{{ column.title }}</th>
				</tr>
			</thead>

			<tbody>
				<tr v-for="process in processes | orderBy sortKey sortOrder | limitBy maxItems">
					<td v-for="column in columns" v-if="column.enabled">{{ lookup(process, column.key) }}</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script>
	import tooltip from './tooltip.vue';

	export default {
		props: [
			'processes'
		],
		components: {
			tooltip
		},
		data() {
			return {
				columns: [
					{ enabled: true, key: 'pid', title: 'PID' },
					{ enabled: true, key: 'memory.percent.resident', title: '%MEM (RSS)' },
					{ enabled: true, key: 'cpu.percent.total', title: '%CPU (Total)' },
					{ enabled: true, key: 'cpu.percent.uTime', title: '%CPU (USR)' },
					{ enabled: true, key: 'cpu.percent.sTime', title: '%CPU (SYS)' },
					{ enabled: false, key: 'cpu.percent.cuTime', title: '%CPU (USR w/kids)' },
					{ enabled: false, key: 'cpu.percent.csTime', title: '%CPU (SYS w/kids)' },
					{ enabled: true, key: 'cpu.percent.blkioTicks', title: '%CPU (I/O)' },
					{ enabled: false, key: 'cpu.percent.gTime', title: '%CPU (guest)' },
					{ enabled: false, key: 'cpu.percent.cgTime', title: '%CPU (guest w/kids)' },
					{ enabled: true, key: 'command', title: 'Command' },
					{ enabled: true, key: 'cwd', title: 'CWD' },
				],

				sortKey: 'cpu.percent.total',
				sortOrder: -1,
				maxItems: 20
			};
		},
		methods: {
			setSort(key) {
				if(this.sortKey == key) {
					this.sortOrder *= -1;
				} else {
					this.sortKey = key;
					switch(key) {
						case 'pid':
						case 'command':
						case 'cwd':
							this.sortOrder = 1;
							break;
						default:
							this.sortOrder = -1;
					}
				}
			},

			lookup(root, key) {
				return key.split(/\./g).reduce((cur, subkey) => (cur || {})[subkey], root);
			}
		}
	}
</script>
