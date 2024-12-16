<?php
$attributes = $attributes ?? array();
$context = array(
    'price' => (int)$attributes['price'],
    'contribution' => 0
);
?>

<div
        data-wp-interactive="donation-calculator"
    <?php echo wp_interactivity_data_wp_context( $context ); ?>
    <?php echo get_block_wrapper_attributes(); ?>
>
    <form aria-label="<?php esc_attr_e( 'Calculate the impact of your donation.' ); ?>" class="calculator">
        <label for="contribution-value" class="calculator-label"><?php esc_html_e( 'Check the impact of your donation:' ); ?></label>
        <div class="calculator-input">$
            <input
                    data-wp-on--input="actions.calculate"
                    placeholder="0"
                    type="number"
                    id="contribution-value"
                    class="calculator-input-form"
            >
        </div>
        <output
                class="calculator-output"
                data-wp-class--show="state.show"
        >
            <?php
            echo sprintf(
                esc_html__( 'Your %s donation will enable us to plant %s trees.' ),
                '<span data-wp-text="state.donation"></span>',
                '<span data-wp-text="state.trees"></span>'
            );?>
        </output>
    </form>
</div>