// Lunch Start event
$('.lunch-start-btn').on('click', function() {
    const id = $(this).data('id');
    $.post('/lunch_start/' + id, function(response) {
        if (response.lunch_start_time) {
            $('#lunch-start-time-' + id).text(response.lunch_start_time);
        }
    }).fail(function(response) {
        alert(response.responseJSON.error);
    });
});

// Lunch End event
$('.lunch-end-btn').on('click', function() {
    const id = $(this).data('id');
    $.post('/lunch_end/' + id, function(response) {
        if (response.lunch_end_time) {
            $('#lunch-end-time-' + id).text(response.lunch_end_time);
        }
    }).fail(function(response) {
        alert(response.responseJSON.error);
    });
});
