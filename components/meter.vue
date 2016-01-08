<style lang="less">
	figure.meter {
		position: relative;
		width: 200px;
		margin: 0.5em 1em;
		padding: 0;

		& > figcaption {
			width: 5em;
		}

		& > .bar {
			position: absolute;
			top: 0;
			bottom: 0;
			left: 5em;
			right: 0;
			margin: 0;
			padding: 0;
			border: 1px solid;
			border-color: gray darkgray darkgray gray;
			box-shadow: inset 2px 1px 2px black;

			& > .fill {
				display: inline-block;
				box-sizing: border-box;
				height: 1em;
				margin: 0;
				padding: 0;
				transition: width 150ms ease-in-out;
			}

			& > .label {
				position: absolute;
				top: 50%;
				right: 0;
				margin-top: -0.5em;
				text-align: right;
				vertical-align: middle;
				z-index: 10;
				font-size: x-small;
				padding-right: 0.2em;
				text-shadow: 1px 1px 3px black;
			}
		}
	}
</style>

<template>
	<figure class="meter">
		<figcaption>{{ title }}</figcaption>
		<div class="bar" v-if="values">
			<div v-for="measurement in measurements" class="fill" :class="measurement.name"
				:style="percentWidth(measurement.value(values))"></div>
			<div v-if="label" class="label">{{ label }}</div>
		</div>
		<slot></slot>
	</figure>
</template>

<script>
	import { asPercent, percentWidth } from '../services/percentage';

	export default {
		props: {
			title: { type: String },
			measurements: { type: Array },
			values: { type: Object },
			label: { type: String }
		},

		methods: {
			asPercent,
			percentWidth
		}
	};
</script>
