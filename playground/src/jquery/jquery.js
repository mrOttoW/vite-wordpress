import './jquery.pcss';

jQuery(document).ready(function () {
  // 1. Change the text of a heading when clicked
  jQuery('h1').click(function () {
    jQuery(this).text('You clicked the heading!');
  });

  // 2. Fade out a paragraph when a button is clicked
  jQuery('button#fadeOutBtn').click(function () {
    jQuery('p').fadeOut();
  });

  // 3. Add a class to an element when mouse hovers over it
  jQuery('div.box').hover(
    function () {
      jQuery(this).addClass('highlight');
    },
    function () {
      jQuery(this).removeClass('highlight');
    }
  );

  // 4. Animate a div to move horizontally
  jQuery('#animateDiv').click(function () {
    jQuery(this).animate(
      {
        left: '+=100px',
        opacity: '0.5',
      },
      500
    );
  });

  // 5. Make an AJAX request to fetch data
  jQuery('#loadDataBtn').click(function () {
    jQuery.ajax({
      url: 'https://jsonplaceholder.typicode.com/posts',
      method: 'GET',
      success: function (data) {
        jQuery('#ajaxData').html('<pre>' + JSON.stringify(data, null, 2) + '</pre>');
      },
      error: function () {
        jQuery('#ajaxData').text('Failed to load data');
      },
    });
  });

  // 6. Toggle visibility of a section
  jQuery('#toggleSectionBtn').click(function () {
    jQuery('#sectionToToggle').toggle();
  });

  // 7. Change the background color of a div
  jQuery('#colorChangeBtn').click(function () {
    jQuery('#colorDiv').css('background-color', '#3498db');
  });

  // 8. Track form input and display live count of characters typed
  jQuery('#textInput').on('input', function () {
    let length = jQuery(this).val().length;
    jQuery('#charCount').text('Character count: ' + length);
  });

  // 9. Scroll to the top of the page when the button is clicked
  jQuery('#scrollTopBtn').click(function () {
    jQuery('html, body').animate({ scrollTop: 0 }, 'slow');
  });

  // 10. Set a timer to automatically hide a message after 3 seconds
  setTimeout(function () {
    jQuery('#autoHideMessage').fadeOut();
  }, 3000);
});
