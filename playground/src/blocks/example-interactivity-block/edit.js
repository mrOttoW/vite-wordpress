import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { __experimentalNumberControl as NumberControl, PanelBody } from '@wordpress/components';
import './editor.pcss';

export default function Edit({ attributes, setAttributes }) {
  const { price } = attributes;
  const exampleDonationAmount = 1000;
  const trees = Math.floor(exampleDonationAmount / price);

  return (
    <div {...useBlockProps()}>
      <InspectorControls>
        <PanelBody title={__('Calculator settings')}>
          <NumberControl
            label={__('Set the price for one tree')}
            help={__('The value will be used for calculations.')}
            value={price}
            min={1}
            onChange={value =>
              setAttributes({
                price: Number(value),
              })
            }
          />
        </PanelBody>
      </InspectorControls>
      <form className="calculator">
        <label for="contribution-value" className="calculator-label">
          {__('Check the impact of your donation:')}
        </label>
        <div class="calculator-input">
          $
          <input disabled value={exampleDonationAmount} className="calculator-input-form" type="number" id="contribution-value" />
        </div>
        <output className="calculator-output">
          {[
            __('Your '),
            <span>${exampleDonationAmount}</span>,
            __(' donation will enable us to plant '),
            <span>{trees}</span>,
            __(' trees.'),
          ]}
        </output>
      </form>
    </div>
  );
}
