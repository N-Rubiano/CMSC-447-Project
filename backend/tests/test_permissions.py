from app.permissions import has_permission, validate_status_transition, can_user_access_pin

def test_admin_has_all_permissions():
    admin = {"role": "admin"}
    assert has_permission(admin, "pin.close") is True
    assert has_permission(admin, "team.manage") is True
    assert has_permission(admin, "project.create") is True

def test_subcontractor_permissions():
    sub = {"role": "sub_contractor"}
    assert has_permission(sub, "pin.close") is False
    assert has_permission(sub, "project.create") is False
    assert has_permission(sub, "pin.view") is True
    assert has_permission(sub, "comment.create") is True

def test_general_contractor_permissions():
    gc = {"role": "general_contractor"}
    assert has_permission(gc, "pin.create") is True
    assert has_permission(gc, "pin.close") is False  # Admin only can close
    assert has_permission(gc, "team.manage") is True

def test_status_transition_sub_open_to_inprogress():
    user = {"role": "sub_contractor", "company_id": "cmp-1"}
    pin = {
        "status": "open",
        "project_id": "proj-1",
        "assigned_subcontractor_id": "cmp-1",
    }
    result = validate_status_transition(user, pin, "in_progress")
    assert result["valid"] is True

def test_status_transition_sub_cannot_close():
    user = {"role": "sub_contractor", "company_id": "cmp-1"}
    pin = {
        "status": "in_progress",
        "project_id": "proj-1",
        "assigned_subcontractor_id": "cmp-1",
    }
    result = validate_status_transition(user, pin, "closed")
    assert result["valid"] is False
