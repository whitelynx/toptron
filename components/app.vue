<style lang="less">
	section.meters {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: space-between;
		align-content: space-between;
		align-items: flex-start;

		& > .meter {
			order: 0;
			flex: 1 0 auto;
			align-self: auto;

			.tooltip > .kvp {
				&.inactive {
					opacity: 0.5;
				}

				& > :first-child::before {
					display: inline-block;
					content: ' ';
					width: 1em;
					height: 1ex;
					margin-right: 0.5em;
					vertical-align: baseline;
				}
			}

			.bar-color(@class; @color) {
				.tooltip > .kvp.@{class} > :first-child::before {
					background: @color;
				}
				.bar > .fill.@{class} {
					background: @color;
				}
			}

			&[class^=cpu], &[class*= cpu] {
				.bar-color(total, black);
				.bar-color(user, green);
				.bar-color(system, red);
				.bar-color(nice, darkgreen);
				.bar-color(iowait, gray);
				.bar-color(irq, orange);
				.bar-color(softirq, darkmagenta);
				.bar-color(steal, darkblue);
				.bar-color(guest, cyan);
				.bar-color(guestNice, darkcyan);
				.bar-color(idle, darkgray);
			}

			&.mem {
				.bar-color(used, green);
				.bar-color(buffers, darkblue);
				.bar-color(cached, orange);
				.bar-color(swapCached, brown);
				.bar-color(free, darkgray);
				.bar-color(available, gray);

				.bar-color(swapUsedUncached, red);
				.bar-color(swapUsedCached, orange);
				.bar-color(swapFree, darkgray);
			}
		}
	}
</style>

<template>
	<section class="meters">
		<meter v-for="meter in meters" :class="meter.key" :title="meter.title" :measurements="meter.measurements"
				:values="lookupObject(stats, meter.key)"
				:label="meter.getTotal(lookupValue(stats, meter.key))">

			<tooltip class="top attached">
				<kvp v-for="measurement in meter.measurements" :title="measurement.name + ':'"
						:class="[ measurement.name, measurement.value(lookupObject(stats, meter.key)) ? '' : 'inactive' ]">
					{{ measurement.string(lookupObject(stats, meter.key)) }}
				</kvp>
				<hr />
				<kvp title="Total:" class="total">{{ meter.getTotal(lookupValue(stats, meter.key)) }}</kvp>
			</tooltip>
		</meter>
	</section>

	<proc-list :processes="processes"></proc-list>
</template>

<script>
	import electron from 'electron';

	import kvp from './kvp.vue';
	import meter from './meter.vue';
	import procList from './proc-list.vue';
	import tooltip from './tooltip.vue';

	import { asPercent } from '../services/percentage';
	import { asSize } from '../services/size';
	import { lookupObject, lookupValue } from '../services/utils';


	function percentMeasurement(key, name, renderString = renderPercent)
	{
		return {
			name: name || key,
			value: (data) => ((data || {}).percent || {})[key],
			string: renderString(key),
		};
	} // end percentMeasurement

	function renderPercent(key)
	{
		return (data) => asPercent(((data || {}).percent || {})[key] || 0, 2);
	} // end renderPercent

	function renderSizeAndPercent(key)
	{
		return (data) => asSize((data || {})[key] || 0, 2) +
			' (' + asPercent(((data || {}).percent || {})[key] || 0, 2) + ')';
	} // end renderSizeAndPercent

	function renderSize(key)
	{
		return (data) => asSize((data || {})[key] || 0, 2);
	} // end renderSize


	const cpuMeterMeasurements = [
		//percentMeasurement('total'),
		percentMeasurement('user'),
		percentMeasurement('nice'),
		percentMeasurement('system'),
		percentMeasurement('iowait'),
		percentMeasurement('irq'),
		percentMeasurement('softirq'),
		percentMeasurement('steal'),
		percentMeasurement('guest'),
		percentMeasurement('guestNice'),
		//percentMeasurement('idle'),
	];

	const memMeterMeasurements = [
		percentMeasurement('used', 'used', renderSizeAndPercent),
		percentMeasurement('buffers', 'buffers', renderSizeAndPercent),
		percentMeasurement('cached', 'cached', renderSizeAndPercent),
		percentMeasurement('swapCached', 'swapCached', renderSizeAndPercent),
		//percentMeasurement('free', 'free', renderSizeAndPercent),
		//percentMeasurement('available', 'available', renderSizeAndPercent),
	];

	const swapMeterMeasurements = [
		percentMeasurement('swapUsedUncached', 'swapUsedUncached', renderSizeAndPercent),
		percentMeasurement('swapUsedCached', 'swapUsedCached', renderSizeAndPercent),
		//percentMeasurement('swapFree', 'swapFree', renderSizeAndPercent),
	];


	export default {
		components: {
			kvp,
			meter,
			procList,
			tooltip
		},
		data()
		{
			var data = {
				stats: { cpu: {}, cpu0: {}, cpu1: {}, cpu2: {}, cpu3: {}, mem: {} },
				processes: [],
				meters: [
					{ title: 'CPU', key: 'cpu', measurements: cpuMeterMeasurements, getTotal: renderPercent('total') },
					{ title: 'CPU 1', key: 'cpu0', measurements: cpuMeterMeasurements, getTotal: renderPercent('total') },
					{ title: 'CPU 2', key: 'cpu1', measurements: cpuMeterMeasurements, getTotal: renderPercent('total') },
					{ title: 'CPU 3', key: 'cpu2', measurements: cpuMeterMeasurements, getTotal: renderPercent('total') },
					{ title: 'CPU 4', key: 'cpu3', measurements: cpuMeterMeasurements, getTotal: renderPercent('total') },
					{ title: 'MEM', key: 'mem', measurements: memMeterMeasurements, getTotal: renderSize('total') },
					{ title: 'SWAP', key: 'mem', measurements: swapMeterMeasurements, getTotal: renderSize('swapTotal') }
				]
			};

			electron.ipcRenderer.on('update', (event, stats, processes) => {
				this.$set('stats', stats);
				this.$set('processes', processes);
			});

			return data;
		},

		methods: {
			asPercent,
			lookupObject: lookupObject,
			lookupValue: lookupValue
		}
	}
</script>
