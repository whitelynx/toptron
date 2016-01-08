<style lang="less">
	div.tooltip {
		position: absolute;
		top: 100%;
		left: 40%;
		padding: 0.5em;
		z-index: 20;
		font-size: x-small;
		background: rgba(34, 34, 34, 0.9);
		border: 1px solid gray;
		border-radius: 0.5em;
		opacity: 0;
		transform: scaleY(0);
		transform-origin: 0 0;
		transition: opacity 250ms ease-in-out, transform 250ms ease-in-out;

		&.top.attached {
			border-top: none;
			border-top-left-radius: 0;
			border-top-right-radius: 0;
		}
	}

	:hover > div.tooltip {
		opacity: 1;
		transform: scaleY(1);
	}

	.tooltip:hover {
		opacity: 0;
		transform: scaleY(0);
	}
</style>

<template>
	<div class="tooltip">
		<slot></slot>
	</div>
</template>
