<style lang="less">
	section.kvp {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: space-between;
		align-content: space-between;
		align-items: flex-start;

		& > * {
			flex: 0 0 auto;
		}

		& > strong {
			display: block;
			margin-right: 1em;
		}
	}
</style>

<template>
	<section class="kvp">
		<strong>{{ title }}</strong>
		<div><slot></slot></div>
	</section>
</template>

<script>
	export default {
		props: {
			title: { type: String }
		}
	};
</script>
